import {
  generateTestCase,
  evaluateTestCase,
  testModes,
} from "./test-case-engine.js?v=instructional-tcb-v2";
import {
  sessionTracker,
  addSessionNavigation,
  roundSummary,
} from "./session.js?v=platform-expansion-v2";
export function startTestCase() {
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
    closed = false;
  $("main").innerHTML =
    `<div class="eyebrow">Big Idea 1 · Testing and debugging</div><h1>Test Case Builder</h1><p class="intro">Construct a useful test. Separate the requirement from what the code actually does.</p><div class="toolbar"><label>Practice mode <select id="mode"><option value="mixed" selected>Mixed Practice</option>${Object.entries(
      testModes,
    )
      .map(([v, l]) => `<option value="${v}">${l}</option>`)
      .join(
        "",
      )}</select></label><button id="new" class="secondary">New Challenge</button></div><section id="stage" class="panel"></section><section id="feedback" class="feedback" role="status" tabindex="-1" hidden></section><p id="stats"></p>`;
  addSessionNavigation("../");
  const response = () =>
    Object.fromEntries(q.fields.map((f) => [f.id, $("field-" + f.id).value]));
  function stats() {
    $("stats").textContent = roundSummary("test-case-builder");
  }
  function finish(correct, text) {
    closed = true;
    for (const el of $("stage").querySelectorAll("input,button"))
      el.disabled = true;
    $("next").disabled = false;
    $("feedback").hidden = false;
    $("feedback").className = "feedback " + (correct ? "good" : "bad");
    $("feedback").textContent = text;
    $("feedback").focus();
    stats();
  }
  function model() {
    const r = evaluateTestCase(q, q.example);
    return (
      "Example valid test:\n" +
      q.fields
        .map(
          (f) =>
            `${f.label}: ${q.example[f.id] === "" ? "(empty)" : q.example[f.id]}`,
        )
        .join("\n") +
      "\n" +
      r.details
    );
  }
  function contextHTML() {
    const pos = q.context.indexOf("\n\nPROCEDURE");
    const boundary = pos >= 0 ? pos : q.context.indexOf("\nvalues ←");
    const prose = boundary >= 0 ? q.context.slice(0, boundary) : "";
    const code =
      boundary >= 0 ? q.context.slice(boundary).trimStart() : q.context;
    return `<p class="context-doc">${esc(prose)}</p><pre class="snippet">${esc(code)}</pre>`;
  }
  function next() {
    if (id) tracker.skip(id);
    q = generateTestCase($("mode").value);
    id = tracker.begin(q.game, q.title, q.topic, q.topicTitle);
    closed = false;
    $("feedback").hidden = true;
    $("stage").innerHTML =
      `<div class="eyebrow">${esc(testModes[q.mode])}</div><h2>${esc(q.prompt)}</h2>${contextHTML()}<details><summary>How to enter results</summary><p>Use TRUE or FALSE, a number, quoted text ("" for empty text), or ERROR. Results are case-sensitive for text. For lists, enter integers separated by commas.</p></details><p class="muted">One scored submission. You will see a worked explanation after checking.</p><div class="builder-fields">${q.fields.map((f) => `<label>${esc(f.label)}<input id="field-${f.id}" type="${f.type === "number" ? "number" : "text"}" ${f.type === "number" ? 'step="1" inputmode="numeric"' : ""} autocomplete="off"></label>`).join("")}</div><div class="actions"><button id="check">Check Answer</button><button id="show" class="secondary">Show Answer</button><button id="next" class="secondary">Next Challenge</button></div>`;
    $("check").onclick = () => {
      if (closed || tracker.status(id) !== "active") return;
      const r = response();
      if (
        q.fields.some(
          (f) =>
            String(r[f.id]).trim() === "" &&
            !(f.id === "input" && ["lists", "strings"].includes(q.mode)),
        )
      ) {
        $("feedback").hidden = false;
        $("feedback").textContent =
          "Complete each result field before checking. Empty list/string inputs are allowed only where specified. No submission counted.";
        return;
      }
      const result = evaluateTestCase(q, r),
        event = tracker.submit(id, result.correct);
      if (!event.accepted) return;
      if (!result.correct) tracker.reveal(id);
      finish(
        result.correct,
        `${result.correct ? "Correct independently on the first submission." : "Incorrect. The worked answer is now revealed; this challenge cannot earn independent correctness."}\n\nYour test:\n${result.details}\n\n${model()}`,
      );
    };
    $("show").onclick = () => {
      if (closed || !tracker.reveal(id)) return;
      finish(
        false,
        "Answer intentionally revealed — not independently solved.\n\n" +
          model(),
      );
    };
    $("next").onclick = next;
    stats();
  }
  $("new").onclick = next;
  $("mode").onchange = next;
  window.addEventListener("pagehide", () => {
    if (id) tracker.skip(id);
  });
  next();
}
startTestCase();
