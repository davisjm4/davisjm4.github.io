import {
  practiceGames,
  generatePractice,
  validatePractice,
  solutionPractice,
  runModel,
  algorithmTests,
  passageFollowup,
} from "./practice-engine.js?v=platform-expansion-v2";
import {
  sessionTracker,
  addSessionNavigation,
  roundSummary,
} from "./session.js?v=platform-expansion-v2";
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function startPractice(slug = document.body.dataset.game) {
  const game = practiceGames[slug];
  if (!game) throw Error("Unknown practice game");
  const $ = (id) => document.getElementById(id),
    tracker = sessionTracker();
  let q,
    instance,
    wrong = 0,
    selected = new Set(),
    order = [];
  document.title = game.title + " | CSP Games";
  $("main").innerHTML =
    `<div class="eyebrow">${game.group === "All five Big Ideas" ? "Across " : "Big Idea "}${escape(game.group)} · ${escape(game.topics)}</div><h1>${game.title}</h1><p class="intro">${game.description}</p>${slug === "mixed-ap-practice" ? '<p class="muted">Original practice questions aligned with AP CSP concepts. These are not official College Board exam questions.</p>' : ""}<div class="toolbar"><label>Practice mode <select id="practice-mode"><option value="mixed" selected>Mixed Practice</option>${Object.entries(
      game.modes,
    )
      .map(([value, label]) => `<option value="${value}">${label}</option>`)
      .join(
        "",
      )}</select></label>${slug === "response-builder" ? '<label>Support level <select id="support"><option value="full" selected>Full Support</option><option value="partial">Partial Support</option><option value="minimal">Minimal Support</option></select></label>' : ""}<button id="new" class="secondary">New Challenge</button></div><section id="stage" class="panel"></section><div id="feedback" class="feedback" role="status" tabindex="-1" hidden></div><p id="stats" class="stats"></p>`;
  addSessionNavigation("../");
  const stats = () => {
    $("stats").textContent = roundSummary(slug);
  };
  const active = () => tracker.status(instance) === "active";
  function fields() {
    return (q.fields || [])
      .map((f) => {
        const label =
          q.support === "minimal" && slug === "response-builder"
            ? f.label.split(":")[0].split(" ")[0]
            : q.support === "partial" && slug === "response-builder"
              ? f.label.split(":")[0]
              : f.label;
        return `<label class="builder-field">${escape(label)} ${f.type === "select" ? `<select id="field-${f.id}"><option value="" selected>Choose a component…</option>${f.options.map((o) => `<option value="${escape(o.value)}">${escape(o.label)}</option>`).join("")}</select>` : `<input id="field-${f.id}" type="${f.type === "number" ? "number" : "text"}" ${f.type === "number" ? 'step="1" inputmode="numeric"' : ""} autocomplete="off">`}</label>`;
      })
      .join("");
  }
  function next(candidate) {
    if (instance) tracker.skip(instance);
    q =
      candidate?.passage && candidate.game === slug
        ? candidate
        : generatePractice(
            slug,
            $("practice-mode").value,
            $("support")?.value || "full",
          );
    instance = tracker.begin(slug, game.title, q.topic, game.modes[q.mode]);
    wrong = 0;
    selected.clear();
    order = [];
    $("feedback").hidden = true;
    $("stage").innerHTML =
      `<div class="eyebrow">${escape(game.modes[q.mode])}</div><h2>${escape(q.prompt)}</h2><pre class="snippet">${escape(q.context)}</pre>${slug === "response-builder" && q.support === "full" ? '<p class="muted">Restate or answer the question, cite relevant evidence, and explain the connection. Add a summary only when it helps.</p>' : ""}${q.kind === "architect" || q.kind === "order" ? '<p>Tap blocks to add them to your construction. Use ↑ / ↓ to arrange them, or Remove to return a block to the bank.</p><div id="block-bank" class="block-bank"></div><ol id="construction" class="construction"></ol>' : ""}${q.kind === "multi" ? '<p>Select two statements, then check.</p><div id="choice-bank" class="block-bank"></div>' : ""}${q.kind === "simulation" ? simulationPanel() : ""}<div class="builder-fields">${fields()}</div>${q.passage ? '<button id="passage-next" class="secondary">Next Question (same passage)</button>' : ""}${q.reflection ? `<label>${escape(q.reflection)}<textarea id="reflection" rows="3"></textarea></label><small class="muted">This reflection is not scored or stored.</small>` : ""}<div class="actions"><button id="practice-check">Check Answer</button><button id="practice-reveal" class="secondary">Show Answer</button><button id="practice-next" class="secondary">Next Challenge</button></div>`;
    if (q.kind === "order" || q.kind === "architect") paintBlocks();
    if (q.kind === "multi") {
      $("choice-bank").innerHTML = q.items
        .map(
          (item) =>
            `<button class="secondary" data-choice="${item.id}" aria-pressed="false">${escape(item.text)}</button>`,
        )
        .join("");
      for (const el of $("choice-bank").querySelectorAll("button"))
        el.onclick = () => {
          if (!active()) return;
          const id = el.dataset.choice;
          selected.has(id) ? selected.delete(id) : selected.add(id);
          el.classList.toggle("selected", selected.has(id));
          el.setAttribute("aria-pressed", selected.has(id));
          $("feedback").hidden = true;
        };
    }
    if (q.kind === "simulation") wireSimulation();
    for (const el of $("stage").querySelectorAll("input,select"))
      el.addEventListener("input", () => {
        $("feedback").hidden = true;
        if (q.kind === "architect") paintBlocks();
      });
    $("practice-check").onclick = check;
    $("practice-reveal").onclick = reveal;
    $("practice-next").onclick = next;
    if ($("passage-next"))
      $("passage-next").onclick = () => next(passageFollowup(q));
    stats();
  }
  function blockText(text) {
    const r = response();
    return text
      .replace(/upperComparison\(([^,]+), (\d+)\)/g, (_, left, right) =>
        r.upperComparison === "NOT >"
          ? `NOT (${left} > ${right})`
          : `${left} ${r.upperComparison || "⟦upper comparison⟧"} ${right}`,
      )
      .replace(/comparison\(([^,]+), (\d+)\)/g, (_, left, right) =>
        r.comparison === "NOT <"
          ? `NOT (${left} < ${right})`
          : `${left} ${r.comparison || "⟦comparison⟧"} ${right}`,
      )
      .replace(/\bfactor\b/g, r.factor || "⟦factor⟧")
      .replace(/\boffset\b/g, r.offset || "⟦offset⟧")
      .replace(/\bupdate\b/g, r.update || "⟦update⟧");
  }
  function paintBlocks() {
    const items = q.kind === "architect" ? q.bank : q.items;
    $("block-bank").innerHTML = items
      .filter((b) => !order.includes(b.id))
      .map(
        (b) =>
          `<button class="secondary block" data-add="${b.id}">${q.support === "full" && b.label ? `<small>${escape(b.label)}</small>` : ""}<pre>${escape(blockText(b.text))}</pre></button>`,
      )
      .join("");
    $("construction").innerHTML = order
      .map((id, i) => {
        const b = items.find((b) => b.id === id);
        return `<li><pre>${escape(blockText(b.text))}</pre><div class="row"><button class="secondary" data-up="${i}" aria-label="Move block ${i + 1} up" ${i === 0 ? "disabled" : ""}>↑</button><button class="secondary" data-down="${i}" aria-label="Move block ${i + 1} down" ${i === order.length - 1 ? "disabled" : ""}>↓</button><button class="secondary" data-remove="${i}">Remove</button></div></li>`;
      })
      .join("");
    for (const b of $("block-bank").querySelectorAll("button"))
      b.onclick = () => {
        if (!active()) return;
        order.push(b.dataset.add);
        paintBlocks();
        $("feedback").hidden = true;
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
        paintBlocks();
        $("feedback").hidden = true;
      };
  }
  function response() {
    return {
      ...Object.fromEntries(
        (q.fields || []).map((f) => [f.id, $("field-" + f.id).value]),
      ),
      order: [...order],
      selected: [...selected],
    };
  }
  function complete(r) {
    for (const f of q.fields || []) {
      const v = r[f.id];
      if (f.type === "select" && !f.options.some((o) => o.value === v))
        return false;
      if (
        f.type === "number" &&
        (String(v).trim() === "" || !Number.isFinite(Number(v)))
      )
        return false;
      if (
        f.type === "text" &&
        String(v).trim() === "" &&
        !(q.kind === "test" && ["lists", "strings"].includes(q.mode))
      )
        return false;
    }
    if ((q.kind === "architect" || q.kind === "order") && !r.order.length)
      return false;
    if (q.kind === "multi" && !r.selected.length) return false;
    return true;
  }
  function message(good, text, neutral = false) {
    $("feedback").hidden = false;
    $("feedback").className =
      "feedback " + (neutral ? "" : good ? "good" : "bad");
    $("feedback").textContent = text;
    $("feedback").focus();
    stats();
  }
  function check() {
    if (!active()) {
      message(
        false,
        "This challenge is no longer active. Choose Next Challenge.",
        true,
      );
      return;
    }
    const r = response();
    if (!complete(r)) {
      message(
        false,
        "Complete your response before checking. This is not counted as an answer submission.",
        true,
      );
      return;
    }
    const correct = validatePractice(q, r),
      result = tracker.submit(instance, correct);
    if (!result.accepted) {
      message(
        false,
        "This challenge is no longer active. Choose Next Challenge.",
        true,
      );
      return;
    }
    if (!correct) {
      wrong++;
      message(
        false,
        `Not quite. Hint ${Math.min(3, wrong)}: ${q.hints[Math.min(2, wrong - 1)]}\nAdjust your response and retry, skip, or intentionally choose Show Answer.`,
      );
      return;
    }
    finish(
      false,
      `${wrong ? "Correct independently after retry." : "Correct on the first try."}\n${q.explanation}${q.kind === "architect" ? `\nYour construction passed ${algorithmTests(q).length} test inputs, including edge cases.` : ""}`,
    );
  }
  function reveal() {
    if (!tracker.reveal(instance)) return;
    const r = solutionPractice(q);
    for (const f of q.fields || []) $("field-" + f.id).value = r[f.id];
    if (q.kind === "order" || q.kind === "architect") {
      order = [...r.order];
      paintBlocks();
    }
    if (q.kind === "multi") {
      selected = new Set(r.selected);
      for (const el of $("choice-bank").querySelectorAll("button")) {
        el.classList.toggle(
          "concept-answer-value",
          selected.has(el.dataset.choice),
        );
        el.setAttribute("aria-pressed", selected.has(el.dataset.choice));
      }
    }
    finish(
      true,
      "Answer revealed — not independently solved.\n" +
        q.explanation +
        "\nThis example cannot earn independent credit. Choose Next Challenge to continue.",
    );
  }
  function finish(revealed, text) {
    for (const el of $("stage").querySelectorAll(
      "input,select,button,textarea",
    ))
      el.disabled = true;
    $("practice-next").disabled = false;
    if ($("passage-next")) $("passage-next").disabled = false;
    message(!revealed, text, revealed);
  }
  function simulationPanel() {
    return `<section class="simulation-experiment"><h3>Experiment (not scored)</h3><div class="row"><label>Event threshold / 10 <input id="sim-p" type="number" min="0" max="10" step="1" value="${q.probability}"></label><label>Trials <input id="sim-n" type="number" min="1" max="1000" step="1" value="${q.trials}"></label><label>Seed <input id="sim-seed" type="number" min="0" max="4294967295" step="1" value="${q.seed}"></label></div><button id="sim-run" class="secondary">Run Simulation</button><p id="sim-results" role="status">Run to inspect simulated observations.</p><div id="sim-chart"></div><p class="muted">Same settings and seed reproduce the same results. This simple independent-trial model does not capture all real-world behavior.</p></section>`;
  }
  function wireSimulation() {
    $("sim-run").onclick = () => {
      const probability = Number($("sim-p").value),
        trials = Number($("sim-n").value),
        seed = Number($("sim-seed").value);
      if (
        !["sim-p", "sim-n", "sim-seed"].every((id) => $(id).value.trim() !== "")
      ) {
        $("sim-results").textContent = "Enter all experiment settings.";
        return;
      }
      let result;
      try {
        result = runModel({ probability, trials, seed });
      } catch {
        $("sim-results").textContent =
          "Use a whole-number threshold 0–10, trial count 1–1000, and seed.";
        return;
      }
      $("sim-results").textContent =
        `Observed events: ${result.success} / ${trials} (${(result.rate * 100).toFixed(1)}%). Model expectation: ${(trials * probability) / 10} events. Observations are not a guaranteed prediction.`;
      const points = result.running
        .map(
          (rate, i) => `${30 + (480 * (i + 1)) / trials},${210 - 180 * rate}`,
        )
        .join(" ");
      $("sim-chart").innerHTML =
        `<svg viewBox="0 0 540 250" role="img" aria-label="Running event proportion over trials. It ends at ${(result.rate * 100).toFixed(1)} percent."><path d="M30 30 V210 H510" fill="none" stroke="currentColor"/><text x="3" y="35" fill="currentColor">1</text><text x="3" y="214" fill="currentColor">0</text><text x="200" y="240" fill="currentColor">Completed trials →</text><polyline points="${points}" fill="none" stroke="#6edcbe" stroke-width="3"/><line x1="30" x2="510" y1="${210 - 18 * probability}" y2="${210 - 18 * probability}" stroke="#edc467" stroke-dasharray="5 5"/></svg><small>Green: observed running proportion. Gold: model probability.</small>`;
    };
  }
  for (const type of ["click", "change", "input"])
    $("stage").addEventListener(type, () => tracker.interact?.(instance));
  $("new").onclick = next;
  $("practice-mode").onchange = next;
  if ($("support"))
    $("support").onchange = () => {
      q.support = $("support").value;
      for (const f of q.fields || []) {
        const label = $("field-" + f.id).parentElement;
        label.firstChild.textContent =
          q.support === "full" ? f.label + " " : f.label.split(":")[0] + " ";
      }
      if (q.kind === "order") paintBlocks();
      $("feedback").hidden = true;
    };
  window.addEventListener("pagehide", () => tracker.skip(instance));
  next();
}
if (
  typeof document !== "undefined" &&
  document.body.dataset.practice === "true"
)
  startPractice();
