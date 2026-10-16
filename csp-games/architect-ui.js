import {
  architectModes,
  generateArchitect,
  evaluateArchitect,
} from "./architect-engine.js?v=instructional-aa-v1";
import {
  sessionTracker,
  addSessionNavigation,
  roundSummary,
} from "./session.js?v=platform-expansion-v2";
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
    closed = false,
    attempts = 0;
  $("main").innerHTML =
    `<div class="eyebrow">Big Idea 3 · Construct algorithms</div><h1>Algorithm Architect</h1><p class="intro">Build a procedure from code components. Test it, inspect a failing case, and revise.</p><div class="toolbar"><label>Practice mode <select id="mode"><option value="mixed" selected>Mixed Practice</option>${Object.entries(
      architectModes,
    )
      .map(([v, l]) => `<option value="${v}">${l}</option>`)
      .join(
        "",
      )}</select></label><button id="new" class="secondary">New Challenge</button></div><section id="stage" class="panel"></section><section id="feedback" class="feedback" role="status" tabindex="-1" hidden></section><p id="stats"></p>`;
  addSessionNavigation("../");
  const stats = () =>
      ($("stats").textContent = roundSummary("algorithm-architect")),
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
    id = tracker.begin(q.game, q.title, q.topic, q.topicTitle);
    order = [];
    closed = false;
    attempts = 0;
    $("feedback").hidden = true;
    const marker = q.context.indexOf("\n\n");
    $("stage").innerHTML =
      `<h2>${esc(q.goal)}</h2><p class="context-doc">${esc(q.context.slice(q.context.indexOf("\n") + 1, marker))}</p><pre class="snippet">${esc(q.context.slice(marker + 2))}</pre><p>Choose the needed blocks; some are unused. Use braces to place statements inside conditions or loops. Move or remove blocks as needed.</p><h3>Available components</h3><div id="bank" class="block-bank"></div><h3>Your procedure body</h3><ol id="construction" class="construction"></ol><div class="actions"><button id="check">Check Answer</button><button id="show" class="secondary">Show Answer</button><button id="next" class="secondary">Next Challenge</button></div>`;
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
