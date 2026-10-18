import {
  buildView,
  gradeFindData,
  renderExplanation,
  providerName,
  findDataChallenges,
  acceptedConcretePaths,
  structuralPathLabel,
  typeLabel,
} from "./response-explorer-engine.js?v=rx-fd-v3";

const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const templates = (data) => data.feedbackTemplates || {};
const formatValue = (row) => {
  if (row.type === "more") return "items not shown in this shortened sample";
  if (row.type === "object") return `{${Object.keys(row.value).length}}`;
  if (row.type === "array") return `[${row.value.length}]`;
  if (row.value === null) return "null";
  if (typeof row.value === "string") {
    const text = row.value.length > 80 ? `${row.value.slice(0, 77)}…` : row.value;
    return `"${text}"`;
  }
  return String(row.value);
};
const outcomeTitle = (result, attempt) => result.correct ? (result.outcome === "alternative" ? "✓ Correct alternative" : "✓ Correct") : `Needs another look · Attempt ${attempt}`;

function treeHtml(rows, state, sampleId) {
  return `<div class="rx-tree" role="tree" aria-label="Interactive API response">
    ${rows.map((row, index) => {
      const selected = state.selection.get(sampleId) === row.concrete;
      const answer = state.revealed && state.acceptedPaths.includes(row.concrete);
      const indent = Math.min(row.depth, 5) * 14;
      return `<div class="rx-tree-row${selected ? " is-selected" : ""}${answer ? " is-answer" : ""}" role="treeitem" aria-level="${row.depth + 1}" aria-selected="${selected}" ${row.container ? `aria-expanded="${row.expanded}"` : ""} style="--rx-indent:${indent}px" data-rx-path="${esc(row.concrete)}">
        ${row.container ? `<button type="button" class="rx-expand" data-rx-expand="${esc(row.concrete)}" aria-label="${row.expanded ? "Collapse" : "Expand"} ${esc(row.key)}" aria-expanded="${row.expanded}">${row.expanded ? "▾" : "▸"}</button>` : `<span class="rx-expand-spacer" aria-hidden="true"></span>`}
        <button type="button" class="rx-node" data-rx-select="${esc(row.concrete)}" aria-label="Select ${esc(row.key)}${row.type === "more" ? "" : `, ${esc(typeLabel(row))}`}" ${row.type === "more" ? "disabled" : ""}>
          <span class="rx-key">${esc(row.key)}</span><span class="rx-value">${esc(formatValue(row))}</span><span class="rx-type">${esc(typeLabel(row))}</span>${selected ? `<span class="rx-state">selected</span>` : ""}${answer ? `<span class="rx-state">answer</span>` : ""}
        </button>
      </div>`;
    }).join("")}
  </div>`;
}

function mountTree(root, body, challenge, state, sampleId, onChange) {
  const overrides = state.expanded.get(sampleId) || new Map();
  const view = buildView(body, challenge, overrides);
  root.innerHTML = treeHtml(view.rows, state, sampleId);
  for (const button of root.querySelectorAll("[data-rx-expand]")) button.onclick = () => {
    const path = button.dataset.rxExpand;
    overrides.set(path, button.getAttribute("aria-expanded") !== "true");
    state.expanded.set(sampleId, overrides);
    onChange();
  };
  for (const button of root.querySelectorAll("[data-rx-select]")) button.onclick = () => {
    state.selection.set(sampleId, button.dataset.rxSelect);
    state.lastSelectedSample = sampleId;
    onChange();
  };
}

function feedbackHtml(state, challenge, result) {
  const hints = state.hints.map((hint, index) => `<details class="rx-hint" ${index === state.hints.length - 1 ? "open" : ""}><summary>Hint ${index + 1} of 3</summary><p>${esc(hint)}</p></details>`).join("");
  if (!state.result && !state.hints.length) return `<p class="muted">Select a response node, then check your answer.</p>`;
  if (!state.result) return `${hints}`;
  if (!result) return `<p class="muted">${esc(templates(state.data).retryPrompt || "Review the response and try again.")}</p>${hints}`;
  if (!result.correct) return `<div class="rx-feedback-head">${esc(outcomeTitle(result, state.attempts))}</div><p>${esc(result.feedback)}</p><p class="muted">${esc(templates(state.data).retryPrompt || "Your response tree stays as you left it. Revise your selection and check again.")}</p>${hints}`;
  const related = Object.fromEntries(state.samples.entries());
  const explanation = renderExplanation(challenge.explanation.text, state.samples.get(challenge.sampleId), related);
  const note = result.outcome === "alternative" ? result.accepted?.note : "";
  const fieldNotes = (challenge.fieldNotes || []).map((item) => `<li><code>${esc(item.path)}</code> — ${esc(item.note)}</li>`).join("");
  return `<div class="rx-feedback-head">${esc(outcomeTitle(result, state.attempts))}</div>${note ? `<p>${esc(note)}</p>` : ""}<p class="rx-explanation">${esc(explanation)}</p>${challenge.javaRelation?.summary ? `<p class="rx-java-note"><strong>How this relates to Java:</strong> ${esc(challenge.javaRelation.summary)}</p>` : ""}${fieldNotes ? `<details class="rx-field-notes"><summary>Field notes</summary><ul>${fieldNotes}</ul></details>` : ""}${hints}`;
}

export function mount({ root, tracker }) {
  const originalRoot = root.innerHTML;
  const originalActions = root.closest("main")?.querySelector(".dl-actions");
  const session = { stop() {} };
  let stopped = false;
  let activeState = null;
  const start = async () => {
  const data = await (await fetch("./response-explorer-data-v1.json")).json();
  if (stopped) return;
  if (!data || data.schemaVersion !== 1) throw new Error("This challenge set needs a newer version of the explorer.");
  const library = { providers: [] };
  const samples = new Map(Object.entries(await (await fetch("./response-explorer-samples-v1.json")).json()));
  const challenges = findDataChallenges(data);
  const providers = [...new Set(challenges.map((challenge) => challenge.providerId))];
  const state = { data, library, samples, challenges, provider: "all", challenge: null, samples: new Map(), selection: new Map(), expanded: new Map(), hints: [], attempts: 0, result: null, revealed: false, acceptedPaths: [], instance: null, stopped: false };
  activeState = state;
  const challengePool = () => state.challenges.filter((challenge) => state.provider === "all" || challenge.providerId === state.provider);
  let lastId = "";
  const nextChallenge = () => {
    if (state.instance && tracker.status(state.instance) === "active") tracker.skip(state.instance);
    const pool = challengePool();
    const different = pool.filter((challenge) => challenge.id !== lastId);
    state.challenge = (different.length ? different : pool)[0];
    lastId = state.challenge?.id || "";
    if (!state.challenge) return;
    state.samples = new Map([[state.challenge.sampleId, samples.get(state.challenge.sampleId)]]);
    for (const related of state.challenge.relatedSamples || []) state.samples.set(related.sampleId, samples.get(related.sampleId));
    state.selection = new Map(); state.expanded = new Map(); state.hints = []; state.attempts = 0; state.result = null; state.revealed = false; state.acceptedPaths = []; state.outcomes = []; state.misconceptionIds = [];
    state.instance = tracker.begin("documentation-lab", "Documentation Lab", `response-explorer/${state.challenge.id}`, state.challenge.title);
    render();
  };
  const render = () => {
    const challenge = state.challenge;
    if (!challenge) { root.innerHTML = `<div class="rx-error"><strong>No Response Explorer challenges are available.</strong></div>`; return; }
    const provider = ({ spotify: "Spotify", youtube: "YouTube", "google-maps": "Google Maps", discord: "Discord", tiktok: "TikTok", openai: "OpenAI" })[challenge.providerId] || challenge.providerId;
    const tabs = [...state.samples.keys()];
    const activeSample = state.activeSample && state.samples.has(state.activeSample) ? state.activeSample : challenge.sampleId;
    state.activeSample = activeSample;
    root.innerHTML = `<div class="rx-shell" data-rx-mode="find-data">
      <div class="rx-head"><div><span class="eyebrow">API Response Explorer · Find the Data</span><h2>${esc(challenge.title)}</h2><p class="muted">Explore an illustrative response and identify the information an application could use. This is a simulation; no account, key, or live request is needed.</p></div><label class="rx-provider">Provider<select id="rx-provider"><option value="all">All Providers</option>${providers.map((id) => `<option value="${esc(id)}"${state.provider === id ? " selected" : ""}>${esc(({ spotify: "Spotify", youtube: "YouTube", "google-maps": "Google Maps", discord: "Discord", tiktok: "TikTok", openai: "OpenAI" })[id] || id)}</option>`).join("")}</select></label></div>
      <section class="rx-section rx-goal"><h3>Application Goal</h3><p>${esc(challenge.context.applicationGoal)}</p><div class="rx-badges"><span>${esc(provider)}</span><span>${esc(challenge.difficulty)}</span></div></section>
      <section class="rx-section rx-response"><h3>API Response</h3><p class="muted">Illustrative sample from <code>${esc(activeSample)}</code>. Values vary in real responses, and arrays may be shortened.</p>${tabs.length > 1 ? `<div class="rx-tabs" role="tablist">${tabs.map((id) => `<button type="button" role="tab" aria-selected="${id === activeSample}" class="${id === activeSample ? "active" : ""}" data-rx-tab="${esc(id)}">${esc(id === challenge.sampleId ? "Primary response" : (challenge.relatedSamples.find((item) => item.sampleId === id)?.caption || id))}</button>`).join("")}</div>` : ""}<div class="rx-tree-wrap" id="rx-tree" tabindex="0"></div><div class="rx-path" aria-live="polite">${state.selection.get(activeSample) ? `Selected: <strong>${esc(structuralPathLabel(state.selection.get(activeSample)))}</strong>` : "Nothing selected yet"}</div></section>
      <section class="rx-section rx-challenge"><h3>Challenge</h3><p>${esc(challenge.instruction)}</p><p class="muted">Select a node in the response. Use the chevron to expand a branch; selecting a row is a separate action.</p><div class="rx-action-row"><button type="button" id="rx-check" ${state.selection.get(activeSample) ? "" : "disabled"}>Check Answer</button><button type="button" class="secondary" id="rx-hint" ${state.hints.length >= 3 ? "disabled" : ""}>${state.hints.length ? `Hint ${state.hints.length + 1} of 3` : "Get Hint"}</button><button type="button" class="secondary" id="rx-reveal" ${state.attempts < 1 || state.result?.correct || state.revealed ? "disabled" : ""}>Show Me the Answer</button><button type="button" class="secondary" id="rx-reset">Reset View</button></div></section>
      <section class="rx-section rx-feedback" aria-live="polite"><h3>Feedback</h3><div id="rx-feedback-body">${feedbackHtml(state, challenge, state.result)}</div></section>
      ${state.result?.correct || state.revealed ? `<div class="rx-next"><button type="button" id="rx-next">Next Challenge →</button></div>` : ""}
    </div>`;
    mountTree(root.querySelector("#rx-tree"), state.samples.get(activeSample), challenge, state, activeSample, render);
    root.querySelector("#rx-provider").onchange = (event) => { state.provider = event.target.value; nextChallenge(); };
    root.querySelectorAll("[data-rx-tab]").forEach((button) => button.onclick = () => { state.activeSample = button.dataset.rxTab; render(); });
    root.querySelector("#rx-check").onclick = check;
    root.querySelector("#rx-hint").onclick = hint;
    root.querySelector("#rx-reset").onclick = () => { state.expanded = new Map(); render(); };
    root.querySelector("#rx-reveal").onclick = reveal;
    root.querySelector("#rx-next")?.addEventListener("click", nextChallenge);
  };
  const check = () => {
    if (!state.selection.get(state.activeSample) || !state.instance || tracker.status(state.instance) !== "active") return;
    const result = gradeFindData(state.challenge, state.selection.get(state.activeSample), templates(state.data));
    state.attempts += 1; state.result = result;
    const record = tracker.submit(state.instance, result.correct);
    tracker.annotate?.(state.instance, { responseExplorer: { completionKind: result.correct ? "accepted" : "active", attempts: state.attempts, hintsShown: state.hints.length, outcomes: [...(state.outcomes || []), result.outcome], misconceptionIds: [...new Set([...(state.misconceptionIds || []), ...(result.misconceptionId ? [result.misconceptionId] : [])])] } });
    state.outcomes = [...(state.outcomes || []), result.outcome];
    state.misconceptionIds = [...new Set([...(state.misconceptionIds || []), ...(result.misconceptionId ? [result.misconceptionId] : [])])];
    if (record.accepted && result.correct) {
      state.acceptedPaths = acceptedConcretePaths(state.challenge, state.samples.get(state.challenge.sampleId));
      tracker.annotate?.(state.instance, { responseExplorer: { completionKind: "accepted", attempts: state.attempts, hintsShown: state.hints.length, outcomes: state.outcomes, misconceptionIds: state.misconceptionIds, needsReview: state.attempts >= 4 || state.hints.length >= 3 } });
    }
    render();
  };
  const hint = () => {
    if (state.hints.length >= 3) return;
    state.hints.push(state.challenge.hints[state.hints.length]);
    tracker.interact(state.instance);
    tracker.annotate?.(state.instance, { responseExplorer: { hintsShown: state.hints.length } });
    render();
  };
  const reveal = () => {
    const message = data.config?.reveal?.confirm || data.feedbackTemplates?.revealConfirm || "Show the answer? This will be recorded as revealed.";
    if (!globalThis.confirm?.(message)) return;
    state.revealed = true; state.result = { correct: true, outcome: "accepted", accepted: state.challenge.grading.accepted[0] };
    state.acceptedPaths = acceptedConcretePaths(state.challenge, state.samples.get(state.challenge.sampleId));
    if (state.instance && tracker.status(state.instance) === "active") tracker.reveal(state.instance);
    tracker.annotate?.(state.instance, { responseExplorer: { completionKind: "answer-revealed", attempts: state.attempts, hintsShown: state.hints.length, outcomes: [...(state.outcomes || []), "answer-revealed"], misconceptionIds: state.misconceptionIds || [], needsReview: true } });
    render();
  };
  if (originalActions) originalActions.hidden = true;
  root.dataset.mode = "response-explorer";
  nextChallenge();
  };
  start().catch((error) => {
    if (!stopped) root.innerHTML = `<div class="rx-error"><strong>Response Explorer could not be loaded.</strong><p>${esc(error.message)}</p></div>`;
  });
  session.stop = () => {
    stopped = true;
    if (activeState) {
      activeState.stopped = true;
      if (activeState.instance && tracker.status(activeState.instance) === "active") tracker.skip(activeState.instance);
    }
    root.innerHTML = originalRoot;
    if (originalActions) originalActions.hidden = false;
  };
  return session;
}

export { treeHtml };
