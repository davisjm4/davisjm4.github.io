import * as J from "./engine.js?v=variable-trace-generator-v1";
import { mathGame } from "./math-lab/engine.js?v=math-v1";
import { robotGame } from "./robot-algorithms/engine.js?v=robot-v3";
import { classObjectGame } from "./class-object-lab/class-engine.js?v=class-object-v1";
import { methodLabGame } from "./method-constructor-lab/engine.js?v=mcl-v1";
import { booleanGame } from "./boolean-conditional-lab/engine.js?v=bool-v1";
import { recursionGame } from "./recursion-lab/engine.js?v=recursion-v1";
import { arrayListGame } from "./arraylist-lab/engine.js?v=arraylist-v1";
import { docLabGame } from "./documentation-lab/engine.js?v=doclab-v1";
import { linkedListGame } from "./linkedlist-lab/engine.js?v=linkedlist-v1";
import { ipLabGame } from "./inheritance-polymorphism-lab/engine.js?v=iplab-v1";
import { diagnostics } from "./diagnostics.js?v=java-quality-v3";
import { mountCollectionEditor } from "../csp-games/collection-editor.js?v=java-v1";
import {
  sessionTracker,
  addSessionNavigation,
  roundSummary,
} from "./session.js?v=per-mode-daily-v1";
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const $ = (id) => document.getElementById(id),
  slug = document.body.dataset.game;
if (!slug) {
  $("main").innerHTML =
    `<div class="eyebrow">DevCat Studios · Java practice</div><h1>Read it. Explore it.<br>Understand it.</h1><p class="intro">Quick, interactive practice for Java code understanding. No code editor, accounts, or required progression.</p><div class="grid">${Object.entries(
      { ...J.games, "math-lab": mathGame, "robot-algorithms": robotGame, "class-object-lab": classObjectGame, "method-constructor-lab": methodLabGame, "boolean-conditional-lab": booleanGame, "recursion-lab": recursionGame, "arraylist-lab": arrayListGame, "documentation-lab": docLabGame, "linkedlist-lab": linkedListGame, "inheritance-polymorphism-lab": ipLabGame },
    )
      .map(
        ([id, g]) =>
          `<article class="card"><div class="icon" aria-hidden="true">${g.icon}</div><h2>${g.name}</h2><small>${g.concepts}</small><p>${g.description}</p><a href="${id}/" class="button">Play ${g.name} →</a></article>`,
      )
      .join(
        "",
      )}</div><section class="panel"><h2>One report for your Java practice</h2><p><a href="session-summary/">Open Session Summary</a> · <a href="coverage.html">Java coverage and roadmap</a> · <a href="../csp-games/">CSP Games</a></p><p>Java and CSP results are separate and stay in this browser. These games complement SkillStruck coding practice and do not claim full AP CSA or district EOP coverage.</p></section>`;
  addSessionNavigation("./");
} else startGame();
function startGame() {
  const game = J.games[slug],
    tracker = sessionTracker(),
    params = typeof URLSearchParams !== "undefined" && typeof location !== "undefined"
      ? new URLSearchParams(location.search)
      : null,
    requestedMode = params?.get("mode"),
    requestedDifficulty = params?.get("difficulty");
  let q,
    instance,
    selected = null,
    selectedFix = null,
    marked = new Set(),
    editor,
    wrong = 0,
    submitted = false,
    timer = null;
  document.title = game.name + " | Java Games";
  $("main").innerHTML =
    `<div class="eyebrow">Java · ${game.concepts}</div><h1>${game.name}</h1><p class="intro">${game.description}</p><div class="toolbar"><label>Practice mode <select id="mode"><option value="mixed" selected>Mixed Practice</option>${Object.entries(
      game.modes,
    )
      .map(([id, label]) => `<option value="${id}">${label}</option>`)
      .join(
        "",
      )}</select></label>${slug === "variable-lab" ? '<label id="difficulty-wrap" hidden>Difficulty <select id="difficulty"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>' : ""}<button id="new" class="secondary">New Challenge</button></div><p id="mode-description" class="muted"></p><section id="stage" class="panel"></section><div id="feedback" class="feedback" role="status" tabindex="-1" hidden></div><p id="stats" class="stats"></p>`;
  addSessionNavigation("../");
  if (requestedMode && game.modes[requestedMode]) $("mode").value = requestedMode;
  if ($("difficulty") && ["beginner", "intermediate", "advanced"].includes(requestedDifficulty))
    $("difficulty").value = requestedDifficulty;
  const syncTraceControls = () => {
      const trace = slug === "variable-lab" && $("mode").value === "trace";
      if ($("difficulty-wrap")) $("difficulty-wrap").hidden = !trace;
      $("mode-description").textContent = trace
        ? "Follow changes to Java variables and predict their values or printed output."
        : "";
    },
    syncUrl = () => {
      if (typeof history === "undefined" || typeof location === "undefined" || !history.replaceState) return;
      const url = new URL(location.href);
      if ($("mode").value === "mixed") url.searchParams.delete("mode");
      else url.searchParams.set("mode", $("mode").value);
      if ($("mode").value === "trace" && $("difficulty")) url.searchParams.set("difficulty", $("difficulty").value);
      else url.searchParams.delete("difficulty");
      history.replaceState(null, "", url);
    };
  syncTraceControls();
  const active = () => tracker.status(instance) === "active",
    stats = () => {
      $("stats").textContent = roundSummary(slug, $("mode").value);
    };
  function renderNode(n) {
    if (typeof n === "string") return esc(n);
    if (n.id === "snippet") return n.children.map(renderNode).join("");
    return `<span class="java-component" data-node="${n.id}" role="button" tabindex="0" aria-pressed="false">${n.text !== undefined ? esc(n.text) : n.children.map(renderNode).join("")}</span>`;
  }
  function next() {
    if (timer) clearTimeout(timer);
    if (instance) tracker.skip(instance);
    q = J.generate(
      slug,
      $("mode").value,
      undefined,
      slug === "variable-lab" && $("mode").value === "trace"
        ? { difficulty: $("difficulty")?.value || "beginner" }
        : {},
    );
    instance = tracker.begin(
      slug,
      game.name,
      q.topic,
      q.topicTitle || q.topic.replaceAll("-", " "),
      q.mode,
      game.modes[q.mode] || q.topicTitle || q.mode,
    );
    if (q.mode === "trace")
      tracker.annotate(instance, { mode: "trace", difficulty: q.difficulty, family: q.traceFamily, format: q.format });
    selected = null;
    selectedFix = null;
    marked.clear();
    wrong = 0;
    submitted = false;
    editor = null;
    $("feedback").hidden = true;
    const diag = diagnostics[q.variant];
    $("stage").innerHTML =
      `<div class="eyebrow">${game.modes[q.mode]}${q.mode === "trace" ? " · " + esc(q.difficulty[0].toUpperCase() + q.difficulty.slice(1)) : ""}</div><h2>${esc(q.prompt)}</h2>${
        q.kind === "debug"
          ? `<p>${esc(q.context)}</p><p class="muted">${esc(q.symptom)}</p>${diag ? `<details class="compiler-diagnostic"><summary>Compiler message</summary><p>Verified javac 17 diagnostic, line ${diag.line}: ${esc(diag.message)}</p></details>` : ""}<pre id="java-code" class="snippet debug-code">${q.tokens.map(t => t.selectable || t.gap ? `<button type="button" class="java-token${t.gap ? " token-gap" : ""}" data-location="${t.id}" aria-pressed="false" aria-label="${esc(t.gap ? "Missing component gap" : t.text)}">${esc(t.gap ? "▯" : t.text)}</button>` : esc(t.text)).join("")}</pre><h3>Choose a correction</h3><div id="fix-bank" class="block-bank">${q.fixes.map((fix, i) => `<button class="secondary" data-fix="${i}"><code>${esc(fix)}</code></button>`).join("")}</div>`
          : q.kind === "assemble"
            ? `<details class="muted"><summary>Introductory type convention</summary><p>${esc(q.convention)}</p></details><div class="builder-fields">${q.fields.map((f) => `<label>${f.label}<select id="piece-${f.id}"><option value="" selected>Choose…</option>${f.choices.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("")}</select></label>`).join("")}</div><pre id="assembly-preview">Choose declaration pieces.</pre>`
            : `<pre id="java-code" class="snippet">${q.kind === "select" ? renderNode(q.root) : esc(q.code)}</pre>${q.kind === "select" ? '<p>Tap a component; Expand Selection includes its surrounding statement or loop.</p><div class="row"><button id="expand" class="secondary" disabled>Expand Selection</button><button id="clear" class="secondary">Clear Selection</button></div><pre id="selected-text">No component selected.</pre>' : ""}`
      }${slug === "array-lab" && q.kind !== "collection" ? `<h3>Starting collection</h3><div class="collection-row collection-start">${q.initial.map((v, i) => `<div class="collection-item"><small>index ${i}</small><button>${v}</button></div>`).join("")}</div>` : ""}${q.kind === "collection" ? '<div id="collection-editor"></div>' : ""}${q.kind === "value" ? `<div id="value-bank" class="row">${q.choices.map((v, i) => `<button class="secondary" data-value="${i}">${esc(v)}</button>`).join("")}</div>` : ""}${q.kind === "multi" ? `<div id="grid" class="java-grid">${q.cells.map((c) => `<button class="secondary" data-cell="${esc(c.id)}" aria-pressed="false">${esc(c.label)}</button>`).join("")}</div>` : ""}<div class="actions"><button id="check">Check Answer</button><button id="show" class="secondary">Show Answer</button><button id="next" class="secondary">Next Challenge</button>${q.trace ? '<button id="watch" class="secondary" hidden disabled>Watch Execution</button>' : ""}</div><section id="execution" hidden></section>`;
    function set(value) {
      if (!active()) return;
      selected = value;
      paint();
      $("feedback").hidden = true;
    }
    if (q.kind === "select") {
      for (const el of $("java-code").querySelectorAll("[data-node]")) {
        el.onclick = (e) => {
          e.stopPropagation();
          set(el.dataset.node);
        };
        el.onkeydown = (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            set(el.dataset.node);
          }
        };
      }
      $("expand").onclick = () => {
        const parent = J.nodes(q.root).find((n) => n.id === selected)?.parent;
        if (parent && parent !== "snippet") set(parent);
      };
      $("clear").onclick = () => set(null);
    }
    if (q.kind === "debug") {
      for (const el of $("java-code").querySelectorAll("[data-location]"))
        el.onclick = () => {
          if (!active()) return;
          selected = el.dataset.location;
          paint();
          $("feedback").hidden = true;
        };
      for (const el of $("fix-bank").querySelectorAll("[data-fix]"))
        el.onclick = () => {
          if (!active()) return;
          selectedFix = q.fixes[Number(el.dataset.fix)];
          paint();
          $("feedback").hidden = true;
        };
    }
    if (q.kind === "value")
      for (const el of $("value-bank").querySelectorAll("button"))
        el.onclick = () => set(q.choices[Number(el.dataset.value)]);
    if (q.kind === "multi")
      for (const el of $("grid").querySelectorAll("button"))
        el.onclick = () => {
          if (!active()) return;
          const id = el.dataset.cell;
          marked.has(id) ? marked.delete(id) : marked.add(id);
          paint();
          $("feedback").hidden = true;
        };
    if (q.kind === "assemble")
      for (const el of $("stage").querySelectorAll("select"))
        el.onchange = () => {
          $("assembly-preview").textContent =
            `${$("piece-type").value || "⟦type⟧"} ${$("piece-name").value || "⟦name⟧"} ${$("piece-operator").value || "⟦operator⟧"} ${$("piece-value").value || "⟦value⟧"};`;
          $("feedback").hidden = true;
        };
    if (q.kind === "collection") {
      editor = mountCollectionEditor($("collection-editor"), {
        initial: q.initial,
        bank: q.bank,
        indexBase: 0,
        fixed: q.fixed,
        columns: q.columns || 0,
        active,
        onChange: () => {
          $("feedback").hidden = true;
        },
      });
      $("collection-editor").javaEditor = editor;
    }
    $("check").onclick = check;
    $("show").onclick = show;
    $("next").onclick = next;
    if ($("watch")) $("watch").onclick = watch;
    stats();
  }
  function paint() {
    for (const el of $("stage").querySelectorAll(
      "[data-node],[data-location],[data-fix],[data-value],[data-cell]",
    )) {
      const chosen = el.hasAttribute("data-node")
        ? selected === el.dataset.node
        : el.hasAttribute("data-location")
          ? selected === el.dataset.location
          : el.hasAttribute("data-fix")
            ? selectedFix === q.fixes[Number(el.dataset.fix)]
            : el.hasAttribute("data-cell")
              ? marked.has(el.dataset.cell)
              : selected === q.choices[Number(el.dataset.value)];
      el.classList.toggle("selected", chosen);
      el.setAttribute("aria-pressed", chosen);
    }
    if (q.kind === "select") {
      const n = J.nodes(q.root).find((n) => n.id === selected);
      $("selected-text").textContent = n
        ? "Your selection: " + n.text
        : "No component selected.";
      $("expand").disabled = !n?.parent || n.parent === "snippet";
    }
  }
  function response() {
    return q.kind === "debug"
      ? { location: selected, fix: selectedFix }
      : q.kind === "collection"
        ? { values: editor.values }
        : q.kind === "multi"
          ? { ids: [...marked] }
          : q.kind === "assemble"
            ? Object.fromEntries(
                q.fields.map((f) => [f.id, $("piece-" + f.id).value]),
              )
            : q.kind === "select"
              ? { id: selected }
              : { answer: selected };
  }
  function complete(r) {
    return q.kind === "debug"
      ? r.location && r.fix
      : q.kind === "collection"
        ? true
        : q.kind === "multi"
          ? r.ids.length
          : q.kind === "assemble"
            ? q.fields.every((f) => r[f.id])
            : q.kind === "select"
              ? r.id
              : r.answer !== null;
  }
  function message(good, text, neutral = false) {
    $("feedback").hidden = false;
    $("feedback").className =
      "feedback " + (neutral ? "" : good ? "good" : "bad");
    $("feedback").textContent = text;
    $("feedback").focus();
    stats();
  }
  function showTraceFeedback() {
    if (q.mode !== "trace" || !q.traceRows) return;
    const variables = Object.keys(q.types || {});
    const header = variables.map((name) => `<th scope="col">${esc(name)}</th>`).join("");
    const rows = q.traceRows
      .map((step) => `<tr><th scope="row">Line ${step.line}</th><td><code>${esc(step.statement)}</code></td>${variables.map((name) => `<td>${step.variables[name] === undefined ? "—" : esc(step.variables[name])}</td>`).join("")}<td>${step.output === null ? "—" : esc(step.output)}</td></tr>`)
      .join("");
    $("execution").hidden = false;
    $("execution").innerHTML =
      `<h3>Execution trace</h3><div class="trace-table-wrap"><table class="trace-table"><thead><tr><th scope="col">Step</th><th scope="col">Statement</th>${header}<th scope="col">Printed output</th></tr></thead><tbody>${rows}</tbody></table></div><div class="trace-explanation">${q.traceRows.map((step) => `<p><strong>Line ${step.line}:</strong> ${esc(step.explanation)}${[...(step.steps || []), ...(step.notes || [])].map(detail => ` ${esc(detail)}`).join("")}</p>`).join("")}</div>`;
  }
  function lockTraceIncorrect() {
    const chosen = selected === null ? "" : String(selected),
      misconception = q.choiceDetails?.find(
        (choice) => String(choice.value) === chosen && choice.misconceptionId,
      );
    if (misconception)
      tracker.annotate(instance, { misconceptionId: misconception.misconceptionId });
    tracker.closeIncorrect(instance);
    selected = String(q.answer);
    paint();
    for (const el of $("stage").querySelectorAll("button,select,input")) el.disabled = true;
    $("next").disabled = false;
    message(
      false,
      `Incorrect. Correct answer: ${q.answer}.${misconception ? " " + misconception.explanation : ""} Review the execution trace below, then choose Next Challenge.`,
    );
    showTraceFeedback();
  }
  function check() {
    if (!active()) {
      message(
        false,
        "This challenge is already complete or belongs to a reset session. Choose New Challenge.",
        true,
      );
      return;
    }
    const r = response();
    if (!complete(r)) {
      message(
        false,
        "Complete the selection before checking. No submission has been counted.",
        true,
      );
      return;
    }
    const correct = J.assess(q, r),
      result = tracker.submit(instance, correct);
    if (!result.accepted) return;
    if (q.mode === "trace") tracker.annotate(instance, { correct });
    submitted = true;
    if ($("watch")) { $("watch").hidden = false; $("watch").disabled = false; }
    if (!correct) {
      if (q.mode === "trace") {
        lockTraceIncorrect();
        return;
      }
      wrong++;
      message(
        false,
        `Not quite. Hint ${Math.min(3, wrong)}: ${J.hint(q, wrong)}\nRetry independently, skip, or choose Show Answer.`,
      );
      return;
    }
    if (q.mode === "trace") {
      finish(false, "Correct on the first try. Review the execution trace below.");
      showTraceFeedback();
      return;
    }
    finish(
      false,
      `${wrong ? "Correct independently after retry." : "Correct on the first try."}\n${q.explanation}`,
    );
  }
  function show() {
    if (!tracker.reveal(instance)) return;
    const answer = J.solution(q);
    if (q.kind === "collection") {
      editor.model.load(answer.values);
      editor.refresh();
    } else if (q.kind === "assemble") {
      for (const f of q.fields) $("piece-" + f.id).value = answer[f.id];
      $("assembly-preview").textContent =
        `${answer.type} ${answer.name} ${answer.operator} ${answer.value};`;
    } else if (q.kind === "debug") {
      selected = answer.location;
      selectedFix = answer.fix;
    } else if (q.kind === "select") selected = answer.id;
    else if (q.kind === "multi") marked = new Set(answer.ids);
    else selected = answer.answer;
    paint();
    finish(
      true,
      "Answer revealed — not independently solved.\n" +
        q.explanation +
        "\nThis challenge cannot earn independent credit.",
    );
    if (q.mode === "trace") showTraceFeedback();
  }
  function finish(revealed, text) {
    for (const el of $("stage").querySelectorAll("button,select,input"))
      el.disabled = true;
    $("next").disabled = false;
    if ($("watch")) {
      $("watch").hidden = false;
      $("watch").disabled = false;
    }
    if (q.kind === "select")
      for (const el of $("java-code").querySelectorAll("[data-node]")) {
        el.setAttribute("aria-disabled", "true");
        el.tabIndex = -1;
        if (el.dataset.node === q.answerId) el.classList.add("answer");
      }
    message(!revealed, text, revealed);
  }
  function watch() {
    if (active() && !submitted) return;
    if (active()) {
      if (
        !window.confirm(
          "Watch Execution will reveal this challenge’s answer and disable independent scoring. Continue?",
        )
      )
        return;
      show();
    }
    if (timer) clearTimeout(timer);
    $("java-code").innerHTML = renderNode(q.root);
    for (const node of $("java-code").querySelectorAll("[data-node]")) {
      node.tabIndex = -1;
      node.setAttribute("aria-disabled", "true");
    }
    $("execution").hidden = false;
    $("execution").innerHTML =
      '<h3>Execution walkthrough</h3><p id="execution-state" role="status"></p><button id="execution-step" class="secondary">Next Step</button><button id="execution-play" class="secondary">Play Animation</button>';
    let index = 0;
    const step = () => {
      const state = q.trace[index];
      if (!state) {
        $("execution-state").textContent += " · Finished.";
        return false;
      }
      $("execution-state").textContent = `Step ${index + 1}: ${Object.entries(
        state.variables,
      )
        .map(([k, v]) => `${k} = ${v}`)
        .join(", ")} · ${state.output}`;
      for (const el of $("java-code").querySelectorAll("[data-node]"))
        el.classList.toggle("answer", el.dataset.node === state.line);
      index++;
      return index < q.trace.length;
    };
    $("execution-step").onclick = () => {
      if (timer) clearTimeout(timer);
      step();
    };
    $("execution-play").onclick = () => {
      if (timer) clearTimeout(timer);
      const run = () => {
        if (step()) timer = setTimeout(run, 700);
      };
      run();
    };
    step();
  }
  $("new").onclick = next;
  $("mode").onchange = () => {
    syncTraceControls();
    syncUrl();
    next();
  };
  if ($("difficulty")) $("difficulty").onchange = () => {
    syncUrl();
    next();
  };
  for (const type of ["click", "input", "change"])
    $("stage").addEventListener(type, () => tracker.interact(instance));
  window.addEventListener("pagehide", () => {
    if (timer) clearTimeout(timer);
    tracker.skip(instance);
  });
  next();
}

