import { loadApiContent, isProductionContent, validatePlan, formativeDiagnostics, endpointsFor, endpointMap, providerFor, createScenarioPicker, preferredPlan } from "./api-project-builder-engine.js?v=api-builder-v8";
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const object = (v) => !!v && typeof v === "object";
const val = (v) => v !== undefined && v !== null && v !== "";
const method = (e) => `<span class="api-method api-${esc(e.method.toLowerCase())}">${esc(e.method)}</span>`;
const runtimeParam = (p) => p.in === "path" || /(^id$|id$|_id$|^forhandle$|^forusername$|^name$)/i.test(p.name) && !p.allowedValues;
function providerNotes(provider) { const notes = Array.isArray(provider.notes) ? provider.notes : [provider.notes]; return notes.filter(Boolean).map((n) => `<li>${esc(n)}</li>`).join(""); }
function studentConstraint(value) {
  if (/\bhandle\s*:\s*@/i.test(value)) return value.replace(/[^.]*\bhandle\s*:\s*@[^.]*/i, "A channel handle is known and can be resolved by the application at run time");
  if (/\bvideo IDs? are already known/i.test(value)) return "The selected videos are known to the application; their identifiers are supplied at run time.";
  if (/\bID is already (known|stored)/i.test(value)) return "A resource has already been selected or saved; the application supplies its identifier at run time.";
  return value;
}
function responseFields(e) { return `<ul class="api-fields">${e.responseFields.map((f) => `<li><code>${esc(f.path)}</code> <span>${esc(f.type)}</span>${f.optional ? " · optional" : ""}${f.nullable ? " · nullable" : ""}${f.deprecated ? " · deprecated" : ""} — ${esc(f.description)}${f.note ? ` <em>${esc(f.note)}</em>` : ""}</li>`).join("")}</ul>`; }
function parameterDocs(p) { const range = p.allowedValues?.length ? `Allowed values: ${p.allowedValues.join(", ")}` : p.minimum != null || p.maximum != null ? `Range: ${p.minimum ?? "no minimum"}–${p.maximum ?? "no maximum"}` : p.format ? `Format: ${p.format}` : ""; return `<div class="api-doc-param"><strong>${esc(p.name)}</strong><span>${p.required ? "Required" : "Optional"} · ${esc(p.in)} parameter · ${esc(p.type)}</span><p>${esc(p.description)}</p>${range ? `<small>${esc(range)}</small>` : ""}</div>`; }
function docsHtml(e, provider) {
  const auth = e.authentication.description || `${e.authentication.type || "Authorization"}${e.authentication.scopes?.length ? ` · Scopes: ${e.authentication.scopes.join(", ")}` : ""}`;
  const restrictions = [e.availability?.status && `Availability: ${e.availability.status}${e.availability.note ? ` — ${e.availability.note}` : ""}`, e.quota && `Quota: ${e.quota.cost} unit(s)${e.quota.bucket ? ` · ${e.quota.bucket} bucket` : ""}${e.quota.dailyLimit ? ` · ${e.quota.dailyLimit} per day` : ""}`, e.pagination?.style && `Pagination: ${e.pagination.style}${e.pagination.details ? ` — ${e.pagination.details}` : ""}`].filter(Boolean);
  return `<article class="api-entry" data-endpoint="${esc(e.id)}"><div class="api-entry-head">${method(e)} <code>${esc(e.path)}</code></div><h3>${esc(e.title)}</h3><p>${esc(e.description)}</p><button type="button" class="secondary api-add" data-add="${esc(e.id)}">Add Request</button><details><summary>Read Documentation</summary><div class="api-doc-detail"><p><strong>Parameters</strong></p><div class="api-param-list">${e.parameters.length ? e.parameters.map(parameterDocs).join("") : "<p>None.</p>"}</div>${e.parameterRules?.length ? `<p><strong>Parameter rules</strong></p><ul>${e.parameterRules.map((r) => `<li>${esc(r.description || `${r.rule}: ${r.parameters.join(", ")}`)}</li>`).join("")}</ul>` : ""}<p><strong>Authorization:</strong> ${esc(auth)}</p><p><strong>Response fields</strong></p>${responseFields(e)}${restrictions.length ? `<p><strong>Availability, quota & paging</strong></p><ul>${restrictions.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}<p><strong>${esc(provider.name)} notes</strong></p><ul>${providerNotes(provider)}</ul><p><a href="${esc(e.sourceUrl)}" target="_blank" rel="noreferrer">Official endpoint documentation ↗</a></p></div></details></article>`;
}
function runtimeSourceFor(scenario, request, parameter) {
  const find = (value, out = []) => { if (object(value) && "$fromStep" in value) out.push(value); else if (object(value)) Object.values(value).forEach((child) => find(child, out)); else if (Array.isArray(value)) value.forEach((child) => find(child, out)); return out; };
  return scenario.acceptedPlans.some((plan) => plan.steps.some((step) => step.endpointId === request.endpointId && find(step.parameters[parameter.name]).length));
}
function exampleParameter(scenario, request, name) { for (const plan of scenario.acceptedPlans) { const step = plan.steps.find((s) => s.endpointId === request.endpointId); if (step && Object.hasOwn(step.parameters, name)) return step.parameters[name]; } return undefined; }
function parameterVariants(scenario, request, parameter) {
  const find = (value, out = []) => { if (object(value) && "$fromStep" in value) out.push(value); else if (object(value)) Object.values(value).forEach((v) => find(v, out)); else if (Array.isArray(value)) value.forEach((v) => find(v, out)); return out; };
  const result = new Map();
  for (const plan of scenario.acceptedPlans) for (const step of plan.steps) if (step.endpointId === request.endpointId && object(step.parameters[parameter.name]) && !find(step.parameters[parameter.name]).length) { const value = step.parameters[parameter.name], shape = scalarPaths(value).map(([path]) => path).join("|"); if (!result.has(shape)) result.set(shape, value); }
  return [...result].map(([shape, value]) => ({ shape, value, label: shape.includes("latitude") && shape.includes("longitude") ? "Use project coordinates" : shape.includes("address") ? "Use project address" : `Project context: ${shape.replaceAll("|", ", ")}` }));
}
function blankShape(value) { if (object(value) && "$fromStep" in value) return undefined; if (Array.isArray(value)) return ""; if (object(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, blankShape(v)]).filter(([, v]) => v !== undefined)); return ""; }
function scalarPaths(value, prefix = "", out = []) { if (object(value)) for (const [k, v] of Object.entries(value)) scalarPaths(v, prefix ? `${prefix}.${k}` : k, out); else if (Array.isArray(value)) out.push([prefix, value]); else out.push([prefix, value]); return out; }
function getPath(value, path) { return path.split(".").reduce((v, k) => v?.[k], value); }
function putPath(value, path, next) { const root = object(value) ? value : {}; const keys = path.split("."); let node = root; for (const key of keys.slice(0, -1)) node = node[key] = object(node[key]) ? node[key] : {}; node[keys.at(-1)] = next; return root; }
function controlsFor(p, request, index, requests, scenario, map) {
  const hasDependency = runtimeSourceFor(scenario, request, p);
  const variants = parameterVariants(scenario, request, p);
  if (hasDependency) {
    if (variants.length) {
      const currentMode = request.dependencies?.[p.name]?.source || (Number.isInteger(request.dependencies?.[p.name]?.fromRequest) ? "request" : "");
      const selectedVariant = request.dependencies?.[p.name]?.shape || variants[0].shape;
      const variant = variants.find((v) => v.shape === selectedVariant) || variants[0];
      let contextFields = "";
      if (currentMode === "context") {
        if (!object(request.parameters[p.name])) request.parameters[p.name] = blankShape(variant.value);
        contextFields = `<label>Project input format<select data-dependency-shape="${esc(p.name)}">${variants.map((v) => `<option value="${esc(v.shape)}"${v.shape === selectedVariant ? " selected" : ""}>${esc(v.label)}</option>`).join("")}</select></label><div class="api-structured-fields">${scalarPaths(variant.value).map(([path, sample]) => `<label class="api-structured-field"><span>${esc(path)}</span><input data-structured="${esc(p.name)}" data-structured-path="${esc(path)}" type="${typeof sample === "number" ? "number" : "text"}"${typeof sample === "number" ? ' step="any"' : ""} value="${esc(getPath(request.parameters[p.name], path))}" placeholder="Project value"></label>`).join("")}</div>`;
      }
      const options = requests.map((r, i) => ({ r, i, e: map.get(r.endpointId) })).filter((x) => x.i < index && x.e);
      const selected = request.dependencies?.[p.name]?.fromRequest;
      const source = requests[selected] && map.get(requests[selected].endpointId), fields = source?.responseFields || [];
      return `<div class="api-param"><span>${esc(p.name)} <b>request source</b></span><span class="api-symbolic">Choose a provided project value or data returned by an earlier request.</span><label>Value source<select data-dependency-mode="${esc(p.name)}"><option value="">Choose a source…</option><option value="context"${currentMode === "context" ? " selected" : ""}>Project context</option><option value="request"${currentMode === "request" ? " selected" : ""}>Earlier API request</option></select></label>${currentMode === "context" ? contextFields : ""}${currentMode === "request" ? `<label>Earlier request<select data-dependency="${esc(p.name)}"><option value="">Choose a request…</option>${options.map((x) => `<option value="${x.i}"${selected === x.i ? " selected" : ""}>${esc(x.e.title)}</option>`).join("")}</select></label>${source ? `<fieldset class="api-dependency-fields"><legend>Response field(s) to use</legend>${fields.map((f) => `<label><input type="checkbox" data-dependency-path="${esc(p.name)}" value="${esc(f.path)}"${request.dependencies[p.name]?.paths?.includes(f.path) ? " checked" : ""}> <code>${esc(f.path)}</code></label>`).join("")}</fieldset>` : ""}` : ""}<em>${esc(p.description)} Use the documentation above to choose the data source and response field(s).</em></div>`;
    }
    const options = requests.map((r, i) => ({ r, i, e: map.get(r.endpointId) })).filter((x) => x.i < index && x.e);
    const selected = request.dependencies?.[p.name]?.fromRequest;
    const source = requests[selected] && map.get(requests[selected].endpointId);
    const fields = source?.responseFields || [];
    return `<div class="api-param"><span>${esc(p.name)} <b>runtime value</b></span><span class="api-symbolic">${esc(p.in === "path" ? "Path resource" : "Related response data")} · supplied by the application at run time</span><label>Earlier request<select data-dependency="${esc(p.name)}"><option value="">Choose a request…</option>${options.map((x) => `<option value="${x.i}"${selected === x.i ? " selected" : ""}>${esc(x.e.title)}</option>`).join("")}</select></label>${source ? `<fieldset class="api-dependency-fields"><legend>Response field(s) to use</legend>${fields.map((f) => `<label><input type="checkbox" data-dependency-path="${esc(p.name)}" value="${esc(f.path)}"${request.dependencies[p.name]?.paths?.includes(f.path) ? " checked" : ""}> <code>${esc(f.path)}</code></label>`).join("")}</fieldset>` : ""}<em>${esc(p.description)} Use the response documentation above to choose the field(s).</em></div>`;
  }
  if (runtimeParam(p) && p.in === "path") return `<div class="api-param"><strong>${esc(p.name)} <b>runtime path value</b></strong><span class="api-symbolic">The application supplies this identifier when a user selects the resource. No value needs to be entered.</span><em>${esc(p.description)}</em></div>`;
  if (runtimeParam(p)) return `<label class="api-param"><span>${esc(p.name)} <b>runtime value</b> <small>${esc(p.in)}</small></span><span class="api-symbolic">The application supplies this selected resource or user input at run time.</span><label class="api-runtime-choice"><input type="checkbox" data-runtime="${esc(p.name)}"${val(request.parameters[p.name]) ? " checked" : ""}> Include this runtime parameter</label><em>${esc(p.description)}</em></label>`;
  if (p.type === "object") {
    const shape = variants[0]?.value || exampleParameter(scenario, request, p.name);
    const currentShape = object(request.parameters[p.name]) ? request.parameters[p.name] : blankShape(shape || {});
    const inputs = scalarPaths(shape || {}).map(([path, sample]) => { const current = getPath(currentShape, path); return `<label class="api-structured-field"><span>${esc(path)}</span><input data-structured="${esc(p.name)}" data-structured-path="${esc(path)}" type="${typeof sample === "number" ? "number" : "text"}"${typeof sample === "number" ? ' step="any"' : ""} value="${esc(current)}" placeholder="Project value"></label>`; }).join("");
    return `<div class="api-param"><strong>${esc(p.name)} <b>structured ${p.required ? "required" : "optional"} input</b></strong><span class="api-symbolic">${esc(p.in)} · set the documented data fields; this is not a resource ID.</span><div class="api-structured-fields">${inputs}</div><em>${esc(p.description)}</em></div>`;
  }
  const current = request.parameters[p.name];
  let control;
  if (p.format === "comma-separated") control = `<input data-param="${esc(p.name)}" type="text" value="${esc(current)}" placeholder="${p.required ? "Required; separate values with commas" : "Optional; separate values with commas"}"><small class="api-allowed-values">Documented values: ${esc((p.allowedValues || []).join(", "))}</small>`;
  else if (p.allowedValues?.length) control = `<select data-param="${esc(p.name)}"><option value="">Choose…</option>${p.allowedValues.map((v) => `<option value="${esc(v)}"${String(current) === String(v) ? " selected" : ""}>${esc(v)}</option>`).join("")}</select>`;
  else if (p.type === "boolean") control = `<select data-param="${esc(p.name)}"><option value="">Choose…</option><option value="true"${current === true ? " selected" : ""}>true</option><option value="false"${current === false ? " selected" : ""}>false</option></select>`;
  else control = `<input data-param="${esc(p.name)}" type="${["integer","number"].includes(p.type) ? "number" : "text"}"${["integer","number"].includes(p.type) ? ` step="${p.type === "integer" ? "1" : "any"}"` : ""}${p.minimum != null ? ` min="${p.minimum}"` : ""}${p.maximum != null ? ` max="${p.maximum}"` : ""} value="${esc(Array.isArray(current) ? current.join(", ") : current)}" placeholder="${p.type === "array<string>" ? "Separate values with commas" : p.required ? "Required choice" : "Optional"}">`;
  return `<label class="api-param"><span>${esc(p.name)} ${p.required ? "<b>required</b>" : "<i>optional</i>"} <small>${esc(p.in)} · ${esc(p.type)}</small></span>${control}<em>${esc(p.description)}</em></label>`;
}
function requestHtml(requests, map, scenario) {
  if (!requests.length) return `<p class="muted">No requests yet. Add an operation from the documentation above.</p>`;
  return requests.map((r, i) => { const e = map.get(r.endpointId); return `<article class="api-request" data-request="${i}"><div class="api-request-head"><span class="api-step">${i + 1}</span><div><strong>${method(e)} ${esc(e.path)}</strong><small>${esc(e.title)}</small></div><button type="button" class="secondary api-remove" data-remove="${i}">Remove Request</button></div><div class="api-request-params">${e.parameters.map((p) => controlsFor(p, r, i, requests, scenario, map)).join("")}</div></article>`; }).join("");
}
function readablePlan(plan, map) {
  const find = (value, out = []) => { if (object(value) && "$fromStep" in value) out.push(value); else if (object(value)) Object.values(value).forEach((v) => find(v, out)); else if (Array.isArray(value)) value.forEach((v) => find(v, out)); return out; };
  return `<ol>${plan.steps.map((s) => { const e = map.get(s.endpointId), values = Object.entries(s.parameters).map(([name, v]) => { const p = e.parameters.find((x) => x.name === name), refs = find(v); if (refs.length) { const sources = refs.map((ref) => map.get(plan.steps.find((x) => x.step === ref.$fromStep)?.endpointId)?.title || "earlier request"); return `${esc(name)} ← ${[...new Set(sources)].map(esc).join(" / ")} response (${refs.map((ref) => esc(ref.path)).join(", ")})`; } if (p && runtimeParam(p)) return `${esc(name)} ← supplied at run time`; return `${esc(name)} = ${esc(typeof v === "object" ? JSON.stringify(v) : v)}`; }).join("; "); return `<li><strong>${esc(e.title)}</strong> <code>${esc(e.method)} ${esc(e.path)}</code>${values ? ` — ${values}` : ""}</li>`; }).join("")}</ol>${plan.conditionalSteps?.length ? `<p><strong>Conditional:</strong> ${plan.conditionalSteps.map((s) => { const e = map.get(s.endpointId); return `${esc(e.title)} only if ${esc(s.condition)}`; }).join("; ")}</p>` : ""}`;
}
function feedbackHtml(result, scenario, diagnostics, attempts) {
  if (result.correct) return `<strong>✓ Project Complete</strong><p>Solved in ${attempts} ${attempts === 1 ? "check" : "checks"}. ${esc(result.efficient ? "Your plan meets the project requirements." : "Your plan works; a simpler plan may also meet the requirements.")}</p><p class="api-explanation"><strong>Why it works:</strong> ${esc(scenario.explanation.summary)} ${scenario.explanation.keyIdeas.map(esc).join(" ")}</p><p class="muted">Your completed request plan remains above for review.</p>`;
  return `<strong>Needs Revision · Attempt ${attempts}</strong><ul class="api-review">${diagnostics.map((d) => `<li>${esc(d.message)}</li>`).join("")}</ul>`;
}
export function mount({ root, controls, tracker }) {
  const state = { stopped: false, data: null, scenario: null, plan: [], picker: null, instance: null, closed: false, providerId: "all", attempts: 0, hintsShown: 0, lastResult: null };
  const set = (id, html) => { const el = root.querySelector(`#${id}`); if (el) el.innerHTML = html; };
  const stat = () => { const el = document.getElementById("stats"); if (el && controls.roundSummary) el.textContent = controls.roundSummary(); };
  const clearStaleFeedback = () => { if (state.lastResult) { state.lastResult = null; const feedback = document.getElementById("feedback"); feedback.hidden = true; feedback.innerHTML = ""; } const hint = root.querySelector("#api-hint-text"); if (hint) hint.textContent = ""; };
  const touch = () => { clearStaleFeedback(); if (state.instance && tracker.status(state.instance) === "active") tracker.interact(state.instance); };
  const next = () => controls.next();
  const updateHintButton = () => { const button = root.querySelector("#api-get-hint"); if (button) button.hidden = state.attempts < 2 || state.hintsShown >= 3 || state.closed; };
  const showActionButtons = () => { controls.submit.textContent = "Check My Plan"; controls.show.textContent = "Show Answer"; controls.show.hidden = false; controls.show.disabled = false; controls.skip.textContent = "Skip"; controls.skip.hidden = false; controls.nextButton.textContent = "Next Project →"; controls.nextButton.hidden = true; controls.submit.hidden = false; controls.submit.disabled = false; controls.skip.disabled = false; };
  const renderBrief = () => {
    const s = state.scenario, p = providerFor(state.data, s);
    const constraints = s.constraints.map(studentConstraint).filter(Boolean);
    set("blocks", `<section class="api-project-goal"><h2>${esc(s.title)}</h2><h3>Goal</h3><p>${esc(s.goal)}</p><h3>Required information</h3><ul>${s.requirements.map((r) => `<li>${esc(r.description)}</li>`).join("")}</ul><h3>Constraints</h3><ul>${constraints.map((c) => `<li>${esc(c)}</li>`).join("")}</ul><p class="api-provider"><strong>Provider:</strong> ${esc(p.name)} · <a href="${esc(p.documentationUrl)}" target="_blank" rel="noreferrer">Official API documentation ↗</a></p></section>`);
  };
  const renderPlan = () => {
    const map = endpointMap(state.data);
    set("interaction", `<section class="api-plan"><div class="api-plan-head"><h2>My Request Plan</h2><p class="muted">Add requests above, then choose the meaningful parameters here. Resource identifiers are symbolic runtime values, not student entry fields.</p><p id="api-request-status" class="api-request-status" role="status">${state.lastAddedEndpoint ? `${esc(map.get(state.lastAddedEndpoint)?.title)} added to your plan.` : ""}</p><p id="api-attempt-status" class="api-request-status">${state.attempts ? `Checks so far: ${state.attempts}.` : ""}</p></div><div id="api-plan-list">${requestHtml(state.plan, map, state.scenario)}</div><p class="api-plan-note">Some projects need one request; others connect data from earlier responses. The order you add independent requests does not affect the result.</p><div class="api-hint-tools"><button id="api-get-hint" type="button" class="secondary" hidden>Get Hint</button><p id="api-hint-text" role="status" aria-live="polite" aria-atomic="true"></p></div></section>`);
    root.querySelectorAll("[data-request]").forEach((card) => {
      const i = Number(card.dataset.request);
      card.querySelectorAll("[data-param]").forEach((input) => { input.oninput = input.onchange = () => { const raw = input.value, parameter = map.get(state.plan[i].endpointId).parameters.find((p) => p.name === input.dataset.param); state.plan[i].parameters[input.dataset.param] = input.type === "number" ? (raw === "" ? "" : Number(raw)) : input.tagName === "SELECT" && ["true","false"].includes(raw) ? raw === "true" : parameter.type === "array<string>" ? raw.split(",").map((x) => x.trim()).filter(Boolean) : raw; touch(); }; });
      card.querySelectorAll("[data-structured]").forEach((input) => { input.oninput = () => { const name = input.dataset.structured, value = input.type === "number" ? (input.value === "" ? "" : Number(input.value)) : input.value; state.plan[i].parameters[name] = putPath(state.plan[i].parameters[name], input.dataset.structuredPath, value); touch(); }; });
      card.querySelectorAll("[data-runtime]").forEach((toggle) => { toggle.onchange = () => { if (toggle.checked) state.plan[i].parameters[toggle.dataset.runtime] = { $runtime: true }; else delete state.plan[i].parameters[toggle.dataset.runtime]; touch(); }; });
      card.querySelectorAll("[data-dependency-mode]").forEach((select) => { select.onchange = () => { const p = select.dataset.dependencyMode, parameter = map.get(state.plan[i].endpointId).parameters.find((x) => x.name === p), variants = parameterVariants(state.scenario, state.plan[i], parameter); if (!select.value) { delete state.plan[i].dependencies[p]; delete state.plan[i].parameters[p]; } else if (select.value === "context") { const variant = variants[0]; state.plan[i].dependencies[p] = { source: "context", shape: variant?.shape || "" }; state.plan[i].parameters[p] = blankShape(variant?.value || {}); } else { state.plan[i].dependencies[p] = { source: "request", fromRequest: null, paths: [] }; delete state.plan[i].parameters[p]; } touch(); renderPlan(); }; });
      card.querySelectorAll("[data-dependency-shape]").forEach((select) => { select.onchange = () => { const p = select.dataset.dependencyShape, parameter = map.get(state.plan[i].endpointId).parameters.find((x) => x.name === p), variant = parameterVariants(state.scenario, state.plan[i], parameter).find((x) => x.shape === select.value); state.plan[i].dependencies[p].shape = select.value; state.plan[i].parameters[p] = blankShape(variant?.value || {}); touch(); renderPlan(); }; });
      card.querySelectorAll("[data-dependency]").forEach((select) => { select.onchange = () => { const p = select.dataset.dependency; if (!select.value) { if (state.plan[i].dependencies[p]) state.plan[i].dependencies[p] = { source: "request", fromRequest: null, paths: [] }; delete state.plan[i].parameters[p]; } else { state.plan[i].dependencies[p] = { source: "request", fromRequest: Number(select.value), paths: [] }; state.plan[i].parameters[p] = { $runtime: true }; } touch(); renderPlan(); }; });
      card.querySelectorAll("[data-dependency-path]").forEach((checkbox) => { checkbox.onchange = () => { const p = checkbox.dataset.dependencyPath, dep = state.plan[i].dependencies[p]; if (!dep) return; dep.paths = [...card.querySelectorAll(`[data-dependency-path="${CSS.escape(p)}"]:checked`)].map((x) => x.value); touch(); }; });
      card.querySelectorAll("[data-dependency-path]").forEach((checkbox) => { checkbox.onchange = () => { const p = checkbox.dataset.dependencyPath, dep = state.plan[i].dependencies[p]; if (!dep) return; dep.paths = [...card.querySelectorAll(`[data-dependency-path="${CSS.escape(p)}"]:checked`)].map((x) => x.value); touch(); }; });
      const remove = card.querySelector("[data-remove]"); remove.onclick = () => { state.plan.splice(i, 1); state.plan.forEach((r) => { for (const d of Object.values(r.dependencies || {})) if (d.fromRequest > i) d.fromRequest--; else if (d.fromRequest === i) d.invalid = true; }); touch(); renderPlan(); renderDocs(); };
    });
    const hintButton = root.querySelector("#api-get-hint");
    hintButton.onclick = () => {
      const current = validatePlan(state.data, state.scenario, { requests: state.plan });
      if (current.correct) { root.querySelector("#api-hint-text").textContent = "Your current plan appears to meet the requirements. Check it to record your result."; return; }
      const diagnostic = formativeDiagnostics(state.data, state.scenario, current, state.plan)[0];
      if (!diagnostic || state.hintsShown >= 3) return;
      root.querySelector("#api-hint-text").textContent = `Hint ${state.hintsShown + 1}: ${diagnostic.hints[state.hintsShown]}`;
      state.hintsShown++; updateHintButton(); if (state.instance) tracker.interact(state.instance);
    };
    updateHintButton();
  };
  const renderDocs = (query = "") => {
    const s = state.scenario, p = providerFor(state.data, s), endpoints = endpointsFor(state.data, s).filter((e) => `${e.title} ${e.path} ${e.description} ${e.method}`.toLowerCase().includes(query.toLowerCase()));
    const filters = `<label class="api-provider-filter">Projects <select id="api-provider-filter"><option value="all">All Projects</option>${state.data.providers.map((v) => `<option value="${esc(v.id)}"${v.id === state.providerId ? " selected" : ""}>${esc(v.name)}</option>`).join("")}</select></label>`;
    set("docs", `<section class="api-docs-browser"><div class="api-docs-head"><div><h2>Browse API Documentation</h2><p class="muted">Read the reference and select the operations your application needs.</p></div><div class="api-browse-controls">${filters}<label class="api-search">Search endpoints <input id="api-search" type="search" placeholder="Search title, path, or description" value="${esc(query)}"></label></div></div><div class="api-entry-list">${endpoints.map((e) => docsHtml(e, p)).join("") || `<p class="muted">No matching endpoints. Try another search.</p>`}</div></section>`);
    const search = root.querySelector("#api-search"); search.oninput = () => { const query = search.value; renderDocs(query); const restored = root.querySelector("#api-search"); restored.focus(); restored.setSelectionRange(query.length, query.length); };
    root.querySelector("#api-provider-filter").onchange = (event) => { state.providerId = event.target.value; nextChallenge(); };
    for (const b of root.querySelectorAll("[data-add]")) b.onclick = () => { const endpointId = b.dataset.add; state.plan.push({ endpointId, parameters: {}, dependencies: {} }); state.lastAddedEndpoint = endpointId; touch(); renderPlan(); root.querySelector("#interaction")?.scrollIntoView({ block: "start", behavior: "smooth" }); };
  };
  const finish = (result, revealed = false) => {
    state.closed = true;
    root.querySelectorAll("input,select,button").forEach((b) => { b.disabled = true; });
    const feedback = document.getElementById("feedback"); feedback.hidden = false; feedback.setAttribute("aria-live", "polite"); feedback.setAttribute("aria-atomic", "true");
    feedback.className = `feedback dl-feedback ${result.correct ? "good" : "shown"}`;
    feedback.innerHTML = revealed ? `<strong>Project revealed · ${state.attempts} ${state.attempts === 1 ? "check" : "checks"}</strong><p>${esc(state.scenario.explanation.summary)} ${state.scenario.explanation.keyIdeas.map(esc).join(" ")}</p><details class="api-solution" open><summary>A valid request plan</summary>${readablePlan(preferredPlan(state.scenario), endpointMap(state.data))}</details><p class="muted dl-small">Recorded as revealed, not independently completed.</p>` : feedbackHtml(result, state.scenario, formativeDiagnostics(state.data, state.scenario, result, state.plan), state.attempts);
    controls.submit.hidden = true; controls.show.hidden = true; controls.skip.hidden = true; controls.nextButton.textContent = "Next Project →"; controls.nextButton.hidden = false; controls.nextButton.disabled = false; controls.nextButton.focus({ preventScroll: true }); stat();
  };
  const submit = () => {
    if (state.closed || !state.instance || tracker.status(state.instance) !== "active") return;
    const result = validatePlan(state.data, state.scenario, { requests: state.plan }), record = tracker.submit(state.instance, result.correct);
    if (!record.accepted) return;
    state.attempts = record.submissions; state.lastResult = result;
    const attemptStatus = root.querySelector("#api-attempt-status"); if (attemptStatus) attemptStatus.textContent = `Checks so far: ${state.attempts}.`;
    if (result.correct) finish(result);
    else {
      const feedback = document.getElementById("feedback"); feedback.hidden = false; feedback.setAttribute("aria-live", "polite"); feedback.setAttribute("aria-atomic", "true"); feedback.className = "feedback dl-feedback api-needs-revision";
      feedback.innerHTML = feedbackHtml(result, state.scenario, formativeDiagnostics(state.data, state.scenario, result, state.plan), state.attempts);
      updateHintButton(); stat();
    }
  };
  const showAnswer = () => {
    if (state.closed || !state.instance || !globalThis.confirm?.("Show a valid solution? You can keep practicing, but this project will be recorded as revealed rather than independently completed.")) return;
    tracker.reveal(state.instance); finish({ correct: false }, true);
  };
  const nextChallenge = () => {
    if (state.stopped) return;
    if (state.instance && tracker.status(state.instance) === "active") tracker.skip(state.instance);
    state.scenario = state.picker(state.providerId); if (!state.scenario) return;
    state.plan = []; state.lastAddedEndpoint = null; state.closed = false; state.attempts = 0; state.hintsShown = 0; state.lastResult = null; state.instance = tracker.begin("documentation-lab", "Documentation Lab", `api-project/${state.scenario.id}`, state.scenario.title);
    document.getElementById("mode-label").textContent = ""; document.getElementById("family").textContent = "";
    document.getElementById("instructions").textContent = "Read the API documentation and select the requests your application needs.";
    document.getElementById("question").textContent = ""; document.getElementById("prompt").hidden = true;
    document.getElementById("stage").dataset.mode = "api-builder";
    const feedback = document.getElementById("feedback"); feedback.hidden = true; feedback.innerHTML = "";
    renderBrief(); renderDocs(); renderPlan(); showActionButtons(); stat();
  };
  const start = async () => {
    try {
      state.data = await loadApiContent();
      if (state.stopped) return;
      if (!isProductionContent(state.data)) { set("interaction", `<div class="api-unavailable"><strong>API Project Builder is not available.</strong><p>Verified production content is not present. Development-only examples are never shown as real APIs.</p></div>`); return; }
      state.picker = createScenarioPicker(state.data);
      state.providerId = "all"; nextChallenge();
    } catch (error) { set("interaction", `<div class="api-unavailable"><strong>API documentation could not be loaded.</strong><p>${esc(error.message)}</p></div>`); }
  };
  controls.submit.onclick = submit; controls.show.onclick = showAnswer; controls.skip.onclick = nextChallenge; controls.nextButton.onclick = nextChallenge;
  start();
  return { stop() { state.stopped = true; if (state.instance && tracker.status(state.instance) === "active") tracker.skip(state.instance); } };
}
