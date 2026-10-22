import {
  buildView, gradeFindData, gradeStructureSingle, gradeStructureSlots,
  gradeStructureClassification, gradeSelectNeeds, renderExplanation,
  structuralPathLabel, typeLabel, concreteForPath,
  readablePath, matchingChallenges, shuffleChallenges, responseExplorerFormatName,
} from "./response-explorer-engine.js?v=rx-activities-v1";

const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const formatValue = (row) => {
  if (row.type === "more") return "items not shown in this shortened sample";
  if (row.type === "object") return `{${Object.keys(row.value).length}}`;
  if (row.type === "array") return `[${row.value.length}]`;
  if (row.value === null) return "null";
  if (typeof row.value === "string") return `"${row.value.length > 80 ? `${row.value.slice(0, 77)}…` : row.value}"`;
  return String(row.value);
};
const providerLabel = (id) => ({ spotify: "Spotify", youtube: "YouTube", "google-maps": "Google Maps", discord: "Discord", tiktok: "TikTok", openai: "OpenAI" })[id] || id;
const titleText = (state) => state.result?.correct ? "✓ Correct" : state.result ? `Needs another look · Attempt ${state.attempts}` : "";

function treeHtml(rows, state, sampleId, markers = new Map()) {
  return `<div class="rx-tree" role="tree" aria-label="Interactive API response">
    ${rows.map((row) => {
      const selected = state.selection.get(sampleId) === row.concrete;
      const answer = state.revealed && state.acceptedPaths.includes(row.concrete);
      const markersForRow = markers.get(row.concrete) || [];
      const indent = Math.min(row.depth, 5) * 14;
      return `<div class="rx-tree-row${selected ? " is-selected" : ""}${answer ? " is-answer" : ""}" role="treeitem" aria-level="${row.depth + 1}" aria-selected="${selected}" ${row.container ? `aria-expanded="${row.expanded}"` : ""} style="--rx-indent:${indent}px" data-rx-path="${esc(row.concrete)}">
        ${row.container ? `<button type="button" class="rx-expand" data-rx-expand="${esc(row.concrete)}" aria-label="${row.expanded ? "Collapse" : "Expand"} ${esc(row.key)}" aria-expanded="${row.expanded}">${row.expanded ? "▾" : "▸"}</button>` : `<span class="rx-expand-spacer" aria-hidden="true"></span>`}
        <button type="button" class="rx-node" data-rx-select="${esc(row.concrete)}" aria-label="Select ${esc(row.key)}, ${esc(typeLabel(row))}" ${row.type === "more" ? "disabled" : ""}>
          ${markersForRow.map((marker) => `<span class="rx-marker">${esc(marker)}</span>`).join("")}<span class="rx-key">${esc(row.key)}</span><span class="rx-value">${esc(formatValue(row))}</span><span class="rx-type">${esc(typeLabel(row))}</span>${selected ? `<span class="rx-state">selected</span>` : ""}${answer ? `<span class="rx-state">answer</span>` : ""}
        </button>
      </div>`;
    }).join("")}
  </div>`;
}

function markersForChallenge(challenge, body) {
  const markers = new Map();
  for (const item of challenge.answer?.items || []) {
    const path = concreteForPath(item.path, body);
    if (path) markers.set(path, [...(markers.get(path) || []), item.id.toUpperCase()]);
  }
  return markers;
}

function feedbackHtml(state, result) {
  const hints = state.hints.map((hint, index) => `<details class="rx-hint" ${index === state.hints.length - 1 ? "open" : ""}><summary>Hint ${index + 1} of 3</summary><p>${esc(hint)}</p></details>`).join("");
  if (result?.correct) {
    const challenge = state.challenge;
    const bodies = Object.fromEntries(state.samples.entries());
    const explanation = renderExplanation(challenge.explanation?.text || "Review how the selected information fits the application goal.", state.samples.get(challenge.sampleId), bodies);
    return `<div class="rx-feedback-head">${esc(titleText(state))}</div><p class="rx-explanation">${esc(explanation)}</p>${challenge.javaRelation?.summary ? `<p class="rx-java-note"><strong>How this relates to Java:</strong> ${esc(challenge.javaRelation.summary)}</p>` : ""}${hints}`;
  }
  if (result) return `<div class="rx-feedback-head">${esc(titleText(state))}</div><p>${esc(result.feedback || "Review how the response is organized and try again.")}</p><p class="muted">Your response tree stays as you left it. Revise your choices and check again.</p>${hints}`;
  if (state.hints.length) return hints;
  return `<p class="muted">Explore the response, make your choices, then check your answer.</p>`;
}

function challengePaths(challenge, body) {
  const result = [];
  for (const item of challenge.grading?.accepted || []) { const path = concreteForPath(item.path, body); if (path) result.push(path); }
  for (const slot of challenge.grading?.slots || []) for (const item of slot.accepted || []) { const path = concreteForPath(item.path, body); if (path) result.push(path); }
  for (const item of challenge.grading?.assignments || []) { const path = concreteForPath(item.path, body); if (path) result.push(path); }
  for (const requirement of challenge.grading?.requirements || []) for (const item of requirement.accepted || []) { const path = concreteForPath(item.path, body); if (path) result.push(path); }
  return [...new Set(result)];
}

export function mount({ root, tracker }) {
  const originalRoot = root.innerHTML;
  const originalActions = root.closest("main")?.querySelector(".dl-actions");
  const session = { stop() {} };
  let stopped = false;
  let activeState = null;
  const start = async () => {
    const data = await (await fetch("./response-explorer-data-v1.json")).json();
    const samplesData = await (await fetch("./response-explorer-samples-v1.json")).json();
    if (stopped) return;
    if (!data || data.schemaVersion !== 1) throw new Error("This challenge set needs a newer version of the explorer.");
    const state = {
      data, allSamples: samplesData, format: "mixed", provider: "all", difficulty: "all", challenge: null,
      samples: new Map(), activeSample: "", selection: new Map(), expanded: new Map(), selectedFields: [],
      slotSelections: {}, classifications: {}, hints: [], attempts: 0, result: null, revealed: false,
      acceptedPaths: [], instance: null, previousId: "", queue: [], outcomes: [], misconceptionIds: [],
    };
    activeState = state;
    const pool = () => matchingChallenges(data, state);
    const resetChallenge = () => {
      state.samples = new Map([[state.challenge.sampleId, samplesData[state.challenge.sampleId]]]);
      for (const related of state.challenge.relatedSamples || []) state.samples.set(related.sampleId, samplesData[related.sampleId]);
      state.activeSample = state.challenge.sampleId;
      state.selection = new Map(); state.expanded = new Map(); state.selectedFields = [];
      state.slotSelections = {}; state.classifications = {}; state.hints = []; state.attempts = 0;
      state.result = null; state.revealed = false; state.acceptedPaths = []; state.outcomes = []; state.misconceptionIds = [];
      state.instance = tracker.begin("documentation-lab", "Documentation Lab", `response-explorer/${state.challenge.id}`, state.challenge.title, "response-explorer", "API Response Explorer");
    };
    const nextChallenge = () => {
      if (state.instance && tracker.status(state.instance) === "active") tracker.skip(state.instance);
      if (!state.queue.length) state.queue = shuffleChallenges(pool(), state.previousId);
      state.challenge = state.queue.shift() || null;
      if (!state.challenge) { render(); return; }
      state.previousId = state.challenge.id;
      resetChallenge(); render();
    };
    const changeFilters = () => {
      if (state.instance && tracker.status(state.instance) === "active") tracker.skip(state.instance);
      state.queue = [];
      const candidates = pool();
      if (!candidates.length) { state.challenge = null; render(); return; }
      state.challenge = shuffleChallenges(candidates, state.previousId).shift();
      state.queue = shuffleChallenges(candidates.filter((challenge) => challenge.id !== state.challenge.id), state.challenge.id);
      state.previousId = state.challenge.id; resetChallenge(); render();
    };
    const renderTree = () => {
      const challenge = state.challenge;
      const sampleId = state.activeSample;
      const body = state.samples.get(sampleId);
      const overrides = state.expanded.get(sampleId) || new Map();
      const view = buildView(body, challenge, overrides);
      const tree = root.querySelector("#rx-tree");
      tree.innerHTML = treeHtml(view.rows, state, sampleId, markersForChallenge(challenge, body));
      for (const button of tree.querySelectorAll("[data-rx-expand]")) button.onclick = () => {
        const path = button.dataset.rxExpand;
        overrides.set(path, button.getAttribute("aria-expanded") !== "true");
        state.expanded.set(sampleId, overrides); renderTree();
      };
      for (const button of tree.querySelectorAll("[data-rx-select]")) button.onclick = () => {
        state.selection.set(sampleId, button.dataset.rxSelect); render();
      };
      const selected = state.selection.get(sampleId);
      root.querySelector("#rx-selected-path").textContent = selected ? `Selected: ${structuralPathLabel(selected)}` : "Nothing selected yet";
      const fieldPath = root.querySelector("#rx-field-selected-path");
      if (fieldPath) fieldPath.textContent = selected ? `Selected: ${structuralPathLabel(selected)}` : "Nothing selected yet";
      const add = root.querySelector("#rx-add-field");
      if (add) add.disabled = !selected || state.selectedFields.includes(selected);
      const check = root.querySelector("#rx-check");
      if (check) check.disabled = challenge.format === "find-data" || (challenge.format === "understand-structure" && challenge.answer.mode === "single") ? !selected : false;
    };
    const classificationPanel = (challenge) => {
      const categories = challenge.answer.categories || [];
      return `<div class="rx-assignment-list">${challenge.answer.items.map((item) => `<fieldset class="rx-assignment"><legend><button type="button" class="rx-focus-item" data-rx-focus-item="${esc(item.id)}">${esc(item.id.toUpperCase())} · ${esc(readablePath(item.path))}</button></legend><div class="rx-choice-row">${categories.map((category) => `<label><input type="radio" name="rx-class-${esc(item.id)}" value="${esc(category.id)}" ${state.classifications[item.id] === category.id ? "checked" : ""}><span><strong>${esc(category.label)}</strong><small>${esc(category.description)}</small></span></label>`).join("")}</div></fieldset>`).join("")}</div>`;
    };
    const interactionPanel = (challenge) => {
      if (challenge.format === "find-data" || (challenge.format === "understand-structure" && challenge.answer.mode === "single")) return `<p class="muted">Select a node in the response. Use the chevron to expand a branch; selecting a row is separate.</p>`;
      if (challenge.format === "understand-structure" && challenge.answer.mode === "slots") return `<p class="muted">Select a node in the response, then assign it to the matching structure below.</p><div class="rx-slot-list">${challenge.grading.slots.map((slot) => `<div class="rx-slot"><div><strong>${esc(slot.label)}</strong><small>${state.slotSelections[slot.id] ? `Selected: ${esc(readablePath(state.slotSelections[slot.id]))}` : "No node assigned yet"}</small></div><button type="button" class="secondary" data-rx-assign-slot="${esc(slot.id)}" ${state.selection.get(state.activeSample) ? "" : "disabled"}>Use selected node</button></div>`).join("")}</div>`;
      if (challenge.format === "understand-structure" && challenge.answer.mode === "classify") return `<p class="muted">The letter badges mark the response nodes to classify. Choose what each node describes.</p>${classificationPanel(challenge)}`;
      const needs = challenge.grading.requirements || [];
      return `<div class="rx-feature-needs"><strong>Feature needs</strong><ul>${needs.map((item) => `<li>${esc(item.label)}</li>`).join("")}</ul></div><p class="muted">Select response values and add them to the fields this application will use. Choose paths supported by the feature, not every field in the response.</p><div class="rx-field-add"><button type="button" class="secondary" id="rx-add-field" ${state.selection.get(state.activeSample) ? "" : "disabled"}>Add selected field</button><span id="rx-field-selected-path">${state.selection.get(state.activeSample) ? `Selected: ${esc(structuralPathLabel(state.selection.get(state.activeSample)))}` : "Nothing selected yet"}</span></div><ul class="rx-selected-fields">${state.selectedFields.map((path, index) => `<li><code>${esc(readablePath(path))}</code><button type="button" class="secondary" data-rx-remove-field="${index}" aria-label="Remove ${esc(readablePath(path))}">Remove</button></li>`).join("") || "<li class=\"muted\">No fields added yet.</li>"}</ul>`;
    };
    const render = () => {
      const challenge = state.challenge;
      if (!challenge) {
        const fmt = responseExplorerFormatName(state.format);
        root.innerHTML = `<div class="rx-shell"><div class="rx-head"><div><span class="eyebrow">API Response Explorer</span><h2>${esc(fmt)}</h2></div>${filtersHtml(state, data)}</div><section class="rx-section rx-empty" role="status"><h3>No challenges match these filters</h3><p>Choose another activity, provider, or difficulty. Your selections will stay in place.</p></section></div>`;
        bindFilters(root, state, changeFilters); return;
      }
      const body = state.samples.get(challenge.sampleId);
      const tabs = [...state.samples.keys()];
      const activeSample = state.activeSample;
      const provider = providerLabel(challenge.providerId);
      root.innerHTML = `<div class="rx-shell" data-rx-format="${esc(challenge.format)}">
        <div class="rx-head"><div><span class="eyebrow">API Response Explorer · ${esc(responseExplorerFormatName(challenge.format))}</span><h2>${esc(challenge.title)}</h2><p class="muted">Explore an illustrative API response. This is a simulation; no account, key, or live request is needed.</p></div>${filtersHtml(state, data)}</div>
        <section class="rx-section rx-goal"><h3>Application Goal</h3><p>${esc(challenge.context.applicationGoal)}</p><div class="rx-badges"><span>${esc(provider)}</span><span>${esc(challenge.difficulty)}</span></div></section>
        <section class="rx-section rx-response"><h3>API Response</h3><p class="muted">Illustrative sample from <code>${esc(activeSample)}</code>. Values vary in real responses, and arrays may be shortened.</p>${tabs.length > 1 ? `<div class="rx-tabs" role="tablist" aria-label="Related response samples">${tabs.map((id) => `<button type="button" role="tab" aria-selected="${id === activeSample}" class="${id === activeSample ? "active" : ""}" data-rx-tab="${esc(id)}">${esc(id === challenge.sampleId ? "Primary response" : (challenge.relatedSamples.find((item) => item.sampleId === id)?.caption || id))}</button>`).join("")}</div>` : ""}<div class="rx-tree-wrap" id="rx-tree" tabindex="0"></div><div class="rx-path" id="rx-selected-path" aria-live="polite">${state.selection.get(activeSample) ? `Selected: ${esc(structuralPathLabel(state.selection.get(activeSample)))}` : "Nothing selected yet"}</div></section>
        <section class="rx-section rx-challenge"><h3>Challenge</h3><p>${esc(challenge.instruction)}</p>${interactionPanel(challenge)}<div class="rx-action-row"><button type="button" id="rx-check" ${challenge.format === "find-data" || (challenge.format === "understand-structure" && challenge.answer.mode === "single") ? (state.selection.get(activeSample) ? "" : "disabled") : ""}>Check Answer</button><button type="button" class="secondary" id="rx-hint" ${state.hints.length >= 3 ? "disabled" : ""}>${state.hints.length ? `Hint ${state.hints.length + 1} of 3` : "Get Hint"}</button><button type="button" class="secondary" id="rx-reveal" ${state.attempts < 1 || state.result?.correct || state.revealed ? "disabled" : ""}>Show Me the Answer</button><button type="button" class="secondary" id="rx-reset">Reset View</button></div></section>
        <section class="rx-section rx-feedback" aria-live="polite"><h3>Feedback</h3><div id="rx-feedback-body">${feedbackHtml(state, state.result)}</div></section>
        ${state.result?.correct || state.revealed ? `<div class="rx-next"><button type="button" id="rx-next">Next Challenge →</button></div>` : ""}
      </div>`;
      renderTree();
      bindFilters(root, state, changeFilters);
      root.querySelectorAll("[data-rx-tab]").forEach((button) => button.onclick = () => { state.activeSample = button.dataset.rxTab; render(); });
      root.querySelector("#rx-check").onclick = check;
      root.querySelector("#rx-hint").onclick = hint;
      root.querySelector("#rx-reset").onclick = () => { state.expanded = new Map(); render(); };
      root.querySelector("#rx-reveal").onclick = reveal;
      root.querySelector("#rx-next")?.addEventListener("click", nextChallenge);
      root.querySelector("#rx-add-field")?.addEventListener("click", () => { const selected = state.selection.get(state.activeSample); if (selected && !state.selectedFields.includes(selected)) state.selectedFields.push(selected); render(); });
      root.querySelectorAll("[data-rx-remove-field]").forEach((button) => button.onclick = () => { state.selectedFields.splice(Number(button.dataset.rxRemoveField), 1); render(); });
      root.querySelectorAll("[data-rx-assign-slot]").forEach((button) => button.onclick = () => { state.slotSelections[button.dataset.rxAssignSlot] = state.selection.get(state.activeSample); render(); });
      root.querySelectorAll("input[name^='rx-class-']").forEach((input) => input.onchange = () => { const id = input.name.replace("rx-class-", ""); state.classifications[id] = input.value; });
      root.querySelectorAll("[data-rx-focus-item]").forEach((button) => button.onclick = () => {
        const item = challenge.answer.items.find((entry) => entry.id === button.dataset.rxFocusItem);
        const concrete = item && concreteForPath(item.path, state.samples.get(challenge.sampleId));
        if (concrete) { state.activeSample = challenge.sampleId; state.selection.set(challenge.sampleId, concrete); expandToPath(challenge, concrete, state, challenge.sampleId); render(); }
      });
    };
    const check = () => {
      if (!state.instance || tracker.status(state.instance) !== "active") return;
      const challenge = state.challenge;
      let result;
      if (challenge.format === "find-data") result = gradeFindData(challenge, state.selection.get(state.activeSample), data.feedbackTemplates);
      else if (challenge.format === "understand-structure" && challenge.answer.mode === "single") result = gradeStructureSingle(challenge, state.selection.get(state.activeSample), data.feedbackTemplates);
      else if (challenge.format === "understand-structure" && challenge.answer.mode === "slots") result = gradeStructureSlots(challenge, state.slotSelections, data.feedbackTemplates);
      else if (challenge.format === "understand-structure" && challenge.answer.mode === "classify") result = gradeStructureClassification(challenge, state.classifications);
      else result = gradeSelectNeeds(challenge, state.selectedFields, data.feedbackTemplates);
      state.attempts += 1; state.result = result;
      const record = tracker.submit(state.instance, result.correct);
      state.outcomes.push(result.outcome);
      tracker.annotate?.(state.instance, { responseExplorer: { activity: challenge.format, difficulty: challenge.difficulty, completionKind: result.correct ? "accepted" : "active", attempts: state.attempts, hintsShown: state.hints.length, outcomes: state.outcomes, needsReview: state.attempts >= 4 || state.hints.length >= 3 } });
      if (record.accepted && result.correct) {
        state.acceptedPaths = challengePaths(challenge, state.samples.get(challenge.sampleId));
        tracker.annotate?.(state.instance, { responseExplorer: { activity: challenge.format, difficulty: challenge.difficulty, completionKind: "accepted", attempts: state.attempts, hintsShown: state.hints.length, outcomes: state.outcomes, needsReview: state.attempts >= 4 || state.hints.length >= 3 } });
      }
      render();
    };
    const hint = () => {
      if (state.hints.length >= 3) return;
      state.hints.push(state.challenge.hints[state.hints.length]);
      tracker.interact(state.instance);
      tracker.annotate?.(state.instance, { responseExplorer: { activity: state.challenge.format, difficulty: state.challenge.difficulty, hintsShown: state.hints.length } });
      render();
    };
    const reveal = () => {
      const message = data.config?.reveal?.confirm || data.feedbackTemplates?.revealConfirm || "Show the answer? This will be recorded as revealed.";
      if (!globalThis.confirm?.(message)) return;
      state.revealed = true;
      state.result = { correct: true, outcome: "accepted" };
      state.acceptedPaths = challengePaths(state.challenge, state.samples.get(state.challenge.sampleId));
      if (state.instance && tracker.status(state.instance) === "active") tracker.reveal(state.instance);
      tracker.annotate?.(state.instance, { responseExplorer: { activity: state.challenge.format, difficulty: state.challenge.difficulty, completionKind: "answer-revealed", attempts: state.attempts, hintsShown: state.hints.length, outcomes: [...state.outcomes, "answer-revealed"], needsReview: true } });
      render();
    };
    const expandToPath = (challenge, concrete, currentState, sampleId) => {
      const tokens = concrete.split(/(?=\.)|(?=\[)/).filter(Boolean);
      let path = "";
      const overrides = currentState.expanded.get(sampleId) || new Map();
      for (let i = 0; i < tokens.length - 1; i++) { path += tokens[i]; if (i < tokens.length - 2) overrides.set(path || "$", true); }
      currentState.expanded.set(sampleId, overrides);
    };
    if (originalActions) originalActions.hidden = true;
    root.dataset.mode = "response-explorer";
    nextChallenge();
  };
  start().catch((error) => { if (!stopped) root.innerHTML = `<div class="rx-error"><strong>Response Explorer could not be loaded.</strong><p>${esc(error.message)}</p></div>`; });
  session.stop = () => {
    stopped = true;
    if (activeState) { if (activeState.instance && tracker.status(activeState.instance) === "active") tracker.skip(activeState.instance); }
    root.innerHTML = originalRoot;
    if (originalActions) originalActions.hidden = false;
  };
  return session;
}

function filtersHtml(state, data) {
  const providers = [...new Set(data.challenges.map((challenge) => challenge.providerId))];
  const formatOptions = [["mixed", "Mixed Practice"], ["find-data", "Find the Data"], ["understand-structure", "Understand the Structure"], ["select-needs", "Select What the App Needs"]];
  return `<div class="rx-filters"><label>Activity<select id="rx-format">${formatOptions.map(([id, label]) => `<option value="${id}"${state.format === id ? " selected" : ""}>${label}</option>`).join("")}</select></label><label>Provider<select id="rx-provider"><option value="all">All Providers</option>${providers.map((id) => `<option value="${esc(id)}"${state.provider === id ? " selected" : ""}>${esc(providerLabel(id))}</option>`).join("")}</select></label><label>Difficulty<select id="rx-difficulty"><option value="all"${state.difficulty === "all" ? " selected" : ""}>All Levels</option><option value="beginner"${state.difficulty === "beginner" ? " selected" : ""}>Beginner</option><option value="intermediate"${state.difficulty === "intermediate" ? " selected" : ""}>Intermediate</option><option value="advanced"${state.difficulty === "advanced" ? " selected" : ""}>Advanced</option></select></label></div>`;
}

function bindFilters(root, state, changeFilters) {
  root.querySelector("#rx-format").onchange = (event) => { state.format = event.target.value; changeFilters(); };
  root.querySelector("#rx-provider").onchange = (event) => { state.provider = event.target.value; changeFilters(); };
  root.querySelector("#rx-difficulty").onchange = (event) => { state.difficulty = event.target.value; changeFilters(); };
}

export { treeHtml };
