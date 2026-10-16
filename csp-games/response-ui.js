import {
  responseModes,
  supportNames,
  generateResponse,
  evaluateResponse,
} from "./response-engine.js?v=instructional-rb-v3";
import {
  sessionTracker,
  addSessionNavigation,
  roundSummary,
} from "./session.js?v=platform-expansion-v2";
export function startResponse() {
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
    line = null,
    closed = false;
  $("main").innerHTML =
    `<div class="eyebrow">Explain using code evidence</div><h1>Response Builder</h1><p class="intro">Build a concise, supported explanation. One submission per short challenge, then review the worked response.</p><div class="toolbar"><label>Practice mode <select id="mode"><option value="mixed" selected>Mixed Practice</option>${Object.entries(
      responseModes,
    )
      .map(([v, l]) => `<option value="${v}">${l}</option>`)
      .join(
        "",
      )}</select></label><label>Support level <select id="support">${Object.entries(
      supportNames,
    )
      .map(
        ([v, l]) =>
          `<option value="${v}" ${v === "full" ? "selected" : ""}>${l}</option>`,
      )
      .join(
        "",
      )}</select></label><button id="new" class="secondary">New Challenge</button></div><p>Changing mode or support starts a new challenge. Support level is recorded with your results.</p><section id="stage" class="panel"></section><section id="feedback" class="feedback" role="status" tabindex="-1" hidden></section><p id="stats"></p>`;
  addSessionNavigation("../");
  const active = () => !closed && tracker.status(id) === "active",
    stats = () => ($("stats").textContent = roundSummary("response-builder"));
  function message(good, text) {
    $("feedback").hidden = false;
    $("feedback").className = "feedback " + (good ? "good" : "bad");
    $("feedback").textContent = text;
    $("feedback").focus();
    stats();
  }
  function freeze() {
    closed = true;
    for (const b of $("stage").querySelectorAll("button,select"))
      b.disabled = true;
    $("next").disabled = false;
  }
  function paint() {
    if (q.layout === "sections") return;
    const minimal = q.support === "minimal";
    $("bank").innerHTML = q.items
      .filter(
        (i) => (!minimal || i.role !== "evidence") && !order.includes(i.id),
      )
      .map(
        (i) =>
          `<button class="secondary sentence" data-add="${i.id}">${esc(i.text)}</button>`,
      )
      .join("");
    $("construction").innerHTML = order
      .map(
        (id, j) =>
          `<li><p>${esc(q.items.find((i) => i.id === id).text)}</p><button class="secondary" data-up="${j}" aria-label="Move sentence ${j + 1} up" ${j === 0 ? "disabled" : ""}>↑</button><button class="secondary" data-down="${j}" aria-label="Move sentence ${j + 1} down" ${j === order.length - 1 ? "disabled" : ""}>↓</button><button class="secondary" data-remove="${j}">Remove</button></li>`,
      )
      .join("");
    for (const b of $("bank").querySelectorAll("button"))
      b.onclick = () => {
        if (active()) {
          order.push(b.dataset.add);
          paint();
        }
      };
    for (const b of $("construction").querySelectorAll("button"))
      b.onclick = () => {
        if (!active()) return;
        const j = Number(b.dataset.up ?? b.dataset.down ?? b.dataset.remove);
        if (b.hasAttribute("data-remove")) order.splice(j, 1);
        else {
          const k = j + (b.hasAttribute("data-up") ? -1 : 1);
          [order[j], order[k]] = [order[k], order[j]];
        }
        paint();
      };
  }
  function revealModel() {
    if (q.layout === "sections")
      for (const role of ["claim", "evidence", "reason"])
        $(role).value = q.correct[role];
    else {
      order =
        q.support === "minimal"
          ? [q.correct.claim, q.correct.reason]
          : q.solution.order.slice();
      paint();
    }
    if (q.support === "minimal") {
      line = q.solution.line;
      for (const b of $("code").querySelectorAll("button")) {
        b.classList.toggle("selected", Number(b.dataset.line) === line);
        b.setAttribute("aria-pressed", String(Number(b.dataset.line) === line));
      }
    }
  }
  function next() {
    if (id) tracker.skip(id);
    q = generateResponse($("mode").value, $("support").value);
    id = tracker.begin(q.game, q.title, q.topic, q.topicTitle);
    order = [];
    line = null;
    closed = false;
    $("feedback").hidden = true;
    const minimal = q.support === "minimal";
    $("stage").innerHTML =
      `<h2>${esc(q.prompt)}</h2>${minimal ? `<p>${esc(q.evidencePrompt)} Then build a two-sentence claim and connection.</p><div id="code" class="snippet code-lines">${q.procedure.lines.map((l, j) => `<button class="secondary code-line" data-line="${j + 1}" aria-label="Line ${j + 1}: ${esc(l)}" aria-pressed="false"><span class="line-number">${j + 1}</span><code>${esc(l || " ")}</code></button>`).join("")}</div>` : `<pre class="snippet">${esc(q.code)}</pre>`}${
        q.layout === "sections"
          ? `<p>Answer the question, cite specific evidence, and connect that evidence to the answer.</p>${[
              ["claim", "Answer"],
              ["evidence", "Code evidence"],
              ["reason", "Explain the connection"],
            ]
              .map(
                ([role, label]) =>
                  `<label class="response-section">${label}<select id="${role}"><option value="" selected>Choose a statement…</option>${q.items
                    .filter((i) => i.role === role)
                    .map(
                      (i) => `<option value="${i.id}">${esc(i.text)}</option>`,
                    )
                    .join("")}</select></label>`,
              )
              .join("")}`
          : `${q.support === "full" ? "<p>Choose a supported answer, relevant evidence, and a connecting explanation. Put the connection after the ideas it explains.</p>" : ""}<p>${minimal ? "Choose two sentences" : "Choose three sentences"} and arrange a coherent explanation. Some statements are unsupported.</p><div id="bank" class="sentence-bank"></div><h3>Your explanation</h3><ol id="construction" class="construction"></ol>`
      }<div class="actions"><button id="check">Check Answer</button><button id="show" class="secondary">Show Answer</button><button id="next" class="secondary">Next Challenge</button></div>`;
    if (minimal)
      for (const b of $("code").querySelectorAll("button"))
        b.onclick = () => {
          if (!active()) return;
          line = Number(b.dataset.line);
          for (const other of $("code").querySelectorAll("button")) {
            other.classList.toggle("selected", other === b);
            other.setAttribute("aria-pressed", String(other === b));
          }
        };
    paint();
    $("check").onclick = () => {
      if (!active()) return;
      const r =
        q.layout === "sections"
          ? Object.fromEntries(
              ["claim", "evidence", "reason"].map((k) => [k, $(k).value]),
            )
          : { order: order.slice(), line };
      if (
        q.layout === "sections"
          ? !Object.values(r).every(Boolean)
          : !order.length || (minimal && !line)
      ) {
        message(
          false,
          "Complete your response before checking. No submission counted.",
        );
        return;
      }
      const result = evaluateResponse(q, r),
        event = tracker.submit(id, result.correct);
      if (!event.accepted) return;
      if (!result.correct) tracker.reveal(id);
      revealModel();
      freeze();
      message(
        result.correct,
        (result.correct
          ? "Correct independently on the first submission."
          : "Incorrect. The worked response is now revealed; this challenge cannot earn independent credit.") +
          "\n" +
          result.details +
          "\nStart another challenge whenever you are ready.",
      );
    };
    $("show").onclick = () => {
      if (!active() || !tracker.reveal(id)) return;
      revealModel();
      freeze();
      message(
        false,
        "Worked response revealed — not independently solved.\n" +
          evaluateResponse(
            q,
            q.support === "minimal"
              ? { ...q.solution, order: [q.correct.claim, q.correct.reason] }
              : q.solution,
          ).details,
      );
    };
    $("next").onclick = next;
    stats();
  }
  $("mode").onchange = next;
  $("support").onchange = next;
  $("new").onclick = next;
  window.addEventListener("pagehide", () => {
    if (id) tracker.skip(id);
  });
  next();
}
startResponse();
