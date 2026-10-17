import { loadApiContent, isProductionContent, validatePlan, formativeDiagnostics, endpointsFor, endpointMap, providerFor, createScenarioPicker, preferredPlan } from "./api-project-builder-engine.js?v=api-builder-v17";
import { presentation, classification, automaticParametersForOccurrence } from "./api-project-presentation.js?v=curated-v4";
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const object = (v) => !!v && typeof v === "object";
const val = (v) => v !== undefined && v !== null && v !== "";
const method = (e) => `<span class="api-method api-${esc(e.method.toLowerCase())}">${esc(e.method)}</span>`;
const runtimeParam = (p) => (p.in === "path" && !p.allowedValues?.length) || /(^id$|id$|_id$|^forhandle$|^forusername$|^name$)/i.test(p.name) && !p.allowedValues?.length;
const VALUE_DESCRIPTIONS = {
  part: {
    snippet: "Basic profile or resource details.",
    statistics: "Counts and other statistics.",
    contentDetails: "Related resources, such as an uploads playlist.",
    brandingSettings: "Channel or resource branding information.",
    status: "Status and availability information.",
    topicDetails: "Associated topics.",
    auditDetails: "Audit information for the resource.",
    contentOwnerDetails: "Content-owner information.",
    localizations: "Translated resource text.",
    player: "Embedded player information.",
    fileDetails: "File processing details.",
    liveStreamingDetails: "Live-streaming information.",
    paidProductPlacementDetails: "Paid product placement information.",
    processingDetails: "Processing status and details.",
    recordingDetails: "Recording location and date details.",
    suggestions: "Processing suggestions.",
    id: "The resource identifier.",
  },
  type: { album: "Search albums.", artist: "Search artists.", playlist: "Search playlists.", track: "Search tracks.", show: "Search shows.", episode: "Search episodes.", audiobook: "Search audiobooks.", video: "Search videos.", channel: "Search channels." },
  include_groups: { album: "Album releases.", single: "Singles and EPs.", appears_on: "Releases the artist appears on.", compilation: "Compilation releases." },
  additional_types: { track: "Track results.", episode: "Episode results." },
  priceLevels: { PRICE_LEVEL_INEXPENSIVE: "Inexpensive places.", PRICE_LEVEL_MODERATE: "Moderately priced places.", PRICE_LEVEL_EXPENSIVE: "Expensive places.", PRICE_LEVEL_VERY_EXPENSIVE: "Very expensive places." },
};
const presentationFor = (endpoint, parameter) => {
  if (parameter.name === "X-Goog-FieldMask" || parameter.name.toLowerCase() === "fields") return "field-mask";
  if ((parameter.name === "locationRestriction" || parameter.name === "locationBias") && parameter.type === "object") return "location";
  if (runtimeParam(parameter)) return "runtime";
  if (parameter.type === "array<string>" && parameter.allowedValues?.length) return "multi";
  if (parameter.format === "comma-separated" && parameter.allowedValues?.length) return "multi";
  if (parameter.allowedValues?.length) return "single";
  if (["integer", "number"].includes(parameter.type) && (parameter.minimum != null || parameter.maximum != null)) return "numeric";
  if (parameter.type === "object") return "structured";
  return "text";
};
const HTTP_REFERENCE = `<details class="api-http-reference"><summary>HTTP Methods — Quick Reference</summary><dl><dt>GET — Retrieve information</dt><dd>Requests an existing resource or collection.</dd><dt>POST — Submit information</dt><dd>Sends criteria for processing. Some APIs use POST for searches without creating anything.</dd><dt>PUT — Create or replace</dt><dd>Creates or replaces the target resource according to the documentation.</dd><dt>PATCH — Partially update</dt><dd>Applies changes to part of an existing resource.</dd><dt>DELETE — Remove</dt><dd>Requests deletion of a resource.</dd></dl><p><strong>Why might a search use POST?</strong> Some APIs accept search criteria in a JSON request body. The method comes from the API documentation; students do not choose it arbitrarily.</p></details>`;
function providerNotes(provider) { const notes = Array.isArray(provider.notes) ? provider.notes : [provider.notes]; return notes.filter(Boolean).map((n) => `<li>${esc(n)}</li>`).join(""); }
const PROVIDER_LABELS = { spotify: "Spotify", youtube: "YouTube", "google-maps": "Google Maps", discord: "Discord", tiktok: "TikTok", openai: "OpenAI" };
function studentConstraint(value) {
  if (/\bhandle\s*:\s*@/i.test(value)) return value.replace(/[^.]*\bhandle\s*:\s*@[^.]*/i, "A channel handle is known and can be resolved by the application at run time");
  if (/\bvideo IDs? are already known/i.test(value)) return "The selected videos are known to the application; their identifiers are supplied at run time.";
  if (/\bID is already (known|stored)/i.test(value)) return "A resource has already been selected or saved; the application supplies its identifier at run time.";
  return value;
}
function studentGoal(scenario) {
  if (scenario.title === "Lunch Spot Finder") return "Your class is organizing a field trip. Build an app that helps students find nearby restaurants using their phone's location. Students should be able to identify each restaurant, see where it is on a map, compare overall customer ratings, and avoid places that are currently closed. Show no more than ten restaurants, prioritize the closest options, and keep results within 1,500 meters.";
  return scenario.goal;
}
function studentRequirement(scenario, requirement) {
  if (scenario.title !== "Lunch Spot Finder") return requirement.description;
  return ({
    r1: "Find places that the app can treat as restaurants.",
    r2: "Keep the search inside the stated distance from the device.",
    r3: "Put the closest options first and show no more than ten.",
    r4: "Identify each result and place it on the map.",
    r5: "Show an overall customer rating when one is available.",
    r6: "Let students tell whether a place is open now.",
  })[requirement.id] || requirement.description;
}
function responseFields(fields) { return `<ul class="api-fields">${fields.map((f) => `<li><code>${esc(f.path)}</code> <span>${esc(f.type)}</span>${f.optional ? " · optional" : ""}${f.nullable ? " · nullable" : ""}${f.deprecated ? " · deprecated" : ""} — ${esc(f.description)}${f.note ? ` <em>${esc(f.note)}</em>` : ""}</li>`).join("")}</ul>`; }
function parameterDocs(p, options) { const range = p.allowedValues?.length ? `${options ? "Relevant documented values" : "Allowed values"}: ${(options || p.allowedValues).join(", ")}` : p.minimum != null || p.maximum != null ? `Range: ${p.minimum ?? "no minimum"}–${p.maximum ?? "no maximum"}` : p.format ? `Format: ${p.format}` : ""; return `<div class="api-doc-param"><strong>${esc(p.name)}</strong><span>${p.required ? "Required" : "Optional"} · ${esc(p.in)} parameter · ${esc(p.type)}</span><p>${esc(p.description)}</p>${range ? `<small>${esc(range)}</small>` : ""}</div>`; }
function focusedFields(e, scenario) {
  const paths = presentation(scenario, e).fields;
  return paths ? paths.map((path) => e.responseFields.find((f) => f.path === path)).filter(Boolean) : e.responseFields.filter((f) => !f.path.includes(".") && !f.path.endsWith("[]")).slice(0, 8);
}
function docsHtml(e, provider, scenario) {
  const config = presentation(scenario, e), groups = classification(scenario, e);
  const shown = e.parameters.filter((p) => groups.assessed.includes(p.name) || groups.automatic.includes(p.name) || p.required);
  const auth = e.authentication.description || `${e.authentication.type || "Authorization"}${e.authentication.scopes?.length ? ` · Scopes: ${e.authentication.scopes.join(", ")}` : ""}`;
  const restrictions = [e.availability?.status && `Availability: ${e.availability.status}${e.availability.note ? ` — ${e.availability.note}` : ""}`, e.quota && `Quota: ${e.quota.cost} unit(s)${e.quota.bucket ? ` · ${e.quota.bucket} bucket` : ""}${e.quota.dailyLimit ? ` · ${e.quota.dailyLimit} per day` : ""}`, e.pagination?.style && `Pagination: ${e.pagination.style}${e.pagination.details ? ` — ${e.pagination.details}` : ""}`].filter(Boolean);
  return `<article class="api-entry" data-endpoint="${esc(e.id)}"><div class="api-entry-head">${method(e)} <code>${esc(e.path)}</code></div><h3>${esc(e.title)}</h3><p>${esc(e.description)}</p><button type="button" class="secondary api-add" data-add="${esc(e.id)}">Add Request</button><details><summary>Read Documentation</summary><div class="api-doc-detail"><p class="muted">Learning-focused extract of the API reference; not every supported optional parameter is shown.</p><p><strong>Relevant parameters</strong></p><div class="api-param-list">${shown.length ? shown.map((item) => parameterDocs(item, item.name === "part" ? config.partOptions : null)).join("") : "<p>No project-specific parameters. See the complete reference below.</p>"}</div>${e.parameterRules?.filter((r) => r.parameters.some((name) => shown.some((p) => p.name === name))).length ? `<p><strong>Relevant parameter rules</strong></p><ul>${e.parameterRules.filter((r) => r.parameters.some((name) => shown.some((p) => p.name === name))).map((r) => `<li>${esc(r.description || `${r.rule}: ${r.parameters.join(", ")}`)}</li>`).join("")}</ul>` : ""}<p><strong>Authorization:</strong> ${esc(auth)}</p><p><strong>Relevant response fields</strong></p>${responseFields(focusedFields(e, scenario))}${restrictions.length ? `<p><strong>Availability, quota & paging</strong></p><ul>${restrictions.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}<details class="api-technical-preview"><summary>Full Technical Documentation</summary><p>All parameters and response fields in the verified content library:</p><div class="api-param-list">${e.parameters.map((item) => parameterDocs(item)).join("") || "None."}</div>${responseFields(e.responseFields)}<p><a href="${esc(e.sourceUrl)}" target="_blank" rel="noreferrer">Official endpoint reference ↗</a></p></details><p><strong>${esc(provider.name)} notes</strong></p><ul>${providerNotes(provider)}</ul></div></details></article>`;
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
function fieldMaskChoices(endpoint) {
  const seen = new Set(), choices = [];
  for (const f of endpoint.responseFields || []) {
    const path = String(f.path).replaceAll("[]", "");
    if (!path || path === "places" || path === "routes" || seen.has(path) || choices.some((choice) => path.startsWith(`${choice.path}.`))) continue;
    seen.add(path);
    choices.push({ path, description: f.description });
  }
  return choices;
}
function fieldMaskControl(endpoint, request, parameter, config) {
  const selected = new Set(String(request.parameters[parameter.name] || "").split(",").map((v) => v.trim()).filter(Boolean));
  const all = fieldMaskChoices(endpoint), choices = config.fieldOptions ? config.fieldOptions.map((path) => all.find((f) => f.path === path) || (endpoint.responseFields.some((f) => f.path.replaceAll("[]", "").startsWith(`${path}.`)) ? { path, description: `Include ${path} and its documented fields.` } : null)).filter(Boolean) : all;
  if (!choices.length) return `<label class="api-param"><span>${esc(parameter.name)} <b>required</b></span><em>${esc(parameter.description)}</em></label>`;
  return `<fieldset class="api-field-selector"><legend>Information to include <b>required</b></legend><p class="api-symbolic">Choose the documented response information the application needs. The simulation handles request formatting.</p><div class="api-field-options">${choices.map((f) => `<label><input type="checkbox" data-field-mask="${esc(parameter.name)}" value="${esc(f.path)}"${selected.has(f.path) ? " checked" : ""}><code>${esc(f.path)}</code><span>${esc(f.description)}</span></label>`).join("")}</div></fieldset>`;
}
function multiChoiceControl(parameter, request, config) {
  const current = Array.isArray(request.parameters[parameter.name]) ? request.parameters[parameter.name] : String(request.parameters[parameter.name] || "").split(",").map((v) => v.trim()).filter(Boolean);
  const descriptions = VALUE_DESCRIPTIONS[parameter.name] || {};
  const values = config.partOptions || config.multiOptions?.[parameter.name] || parameter.allowedValues || [];
  return `<fieldset class="api-multi-selector"><legend>${esc(parameter.name)} ${parameter.required ? "<b>required</b>" : "<i>optional</i>"}</legend><p class="api-symbolic">Select one or more documented values. The API list syntax is generated for you.</p><div class="api-multi-options">${values.map((value) => `<label><input type="checkbox" data-param-multi="${esc(parameter.name)}" value="${esc(value)}"${current.includes(value) ? " checked" : ""}><code>${esc(value)}</code><span>${esc(descriptions[value] || `Documented ${parameter.name} option.`)}</span></label>`).join("")}</div><em>${esc(parameter.description)}</em></fieldset>`;
}
function serializeMultiSelection(parameter, values) { const selected = new Set(values); const source = parameter.allowedValues?.length ? parameter.allowedValues : values; const ordered = source.filter((value) => selected.has(value)); return parameter.type === "array<string>" ? ordered : ordered.join(","); }
function locationControl(scenario, request, parameter, variants) {
  const scenarioValue = scenario.acceptedPlans.flatMap((plan) => plan.steps).map((step) => step.parameters?.[parameter.name]).find((value) => object(value) && !Object.hasOwn(value, "$fromStep"));
  if (!variants.length && scenarioValue) variants = [{ value: scenarioValue, shape: "project-location", label: "Project supplied location" }];
  const current = request.parameters[parameter.name];
  const dep = request.dependencies?.[parameter.name];
  const sourceValue = dep?.source === "context" ? "context" : dep?.source === "request" ? "request" : scenarioValue ? "context" : "";
  const variant = variants[0];
  const radius = object(current) ? current?.circle?.radius : "";
  const radiusOptions = [500, 1000, 1500, 2000, 5000].filter((v) => v >= (parameter.minimum || 0) && v <= (parameter.maximum || 50000));
  const contextLabel = /coordinates|GPS/i.test(scenario.constraints.join(" ")) ? "Device GPS" : (variant?.label || "Project supplied location");
  return `<label class="api-location-control api-param">Search radius <b>required</b><span class="api-symbolic">Center: ${esc(contextLabel)} (handled by the application).</span><select data-location-radius="${esc(parameter.name)}"><option value="">Choose a distance…</option>${radiusOptions.map((v) => `<option value="${v}"${String(radius) === String(v) ? " selected" : ""}>${v.toLocaleString()} meters</option>`).join("")}</select><em>${esc(parameter.description)}</em></label>`;
}
function originControl(requests, index, request, map) {
  const origin = request.parameters.origin, dep = request.dependencies?.origin;
  const mode = dep?.source === "request" ? "request" : origin?.address ? "address" : origin?.location ? "coordinates" : "";
  const options = requests.map((r, i) => ({ i, e: map.get(r.endpointId) })).filter((x) => x.i < index && x.e);
  const selected = dep?.fromRequest, source = requests[selected] && map.get(requests[selected].endpointId);
  const fields = source?.responseFields.filter((f) => presentation({ id: "maps-museum-walk-planner" }, source).fields?.includes(f.path)) || [];
  return `<div class="api-param"><strong>origin <b>required</b></strong><label>Hotel location source<select data-origin-source><option value="">Choose a source…</option><option value="address"${mode === "address" ? " selected" : ""}>Hotel address from project</option><option value="coordinates"${mode === "coordinates" ? " selected" : ""}>Hotel coordinates from project</option><option value="request"${mode === "request" ? " selected" : ""}>Earlier geocoding response</option></select></label>${mode === "request" ? `<label>Earlier request<select data-dependency="origin"><option value="">Choose a request…</option>${options.map((x) => `<option value="${x.i}"${selected === x.i ? " selected" : ""}>${esc(x.e.title)}</option>`).join("")}</select></label>${source ? `<fieldset class="api-dependency-fields"><legend>Response field(s) to use</legend>${fields.map((f) => `<label><input type="checkbox" data-dependency-path="origin" value="${esc(f.path)}"${dep?.paths?.includes(f.path) ? " checked" : ""}> <code>${esc(f.path)}</code></label>`).join("")}</fieldset>` : ""}` : ""}<em>The origin can use the provided address or coordinates, or data returned by an earlier request.</em></div>`;
}
function blankShape(value) { if (object(value) && "$fromStep" in value) return undefined; if (Array.isArray(value)) return ""; if (object(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, blankShape(v)]).filter(([, v]) => v !== undefined)); return ""; }
function containsReference(value) { if (object(value) && "$fromStep" in value) return true; if (object(value)) return Object.values(value).some(containsReference); if (Array.isArray(value)) return value.some(containsReference); return false; }
function scalarPaths(value, prefix = "", out = []) { if (object(value)) for (const [k, v] of Object.entries(value)) scalarPaths(v, prefix ? `${prefix}.${k}` : k, out); else if (Array.isArray(value)) out.push([prefix, value]); else out.push([prefix, value]); return out; }
function getPath(value, path) { return path.split(".").reduce((v, k) => v?.[k], value); }
function putPath(value, path, next) { const root = object(value) ? value : {}; const keys = path.split("."); let node = root; for (const key of keys.slice(0, -1)) node = node[key] = object(node[key]) ? node[key] : {}; node[keys.at(-1)] = next; return root; }
function controlsFor(p, request, index, requests, scenario, map) {
  const config = presentation(scenario, map.get(request.endpointId));
  if (scenario.id === "maps-museum-walk-planner" && request.endpointId === "maps.routes-compute-routes" && p.name === "origin") return originControl(requests, index, request, map);
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
      const source = requests[selected] && map.get(requests[selected].endpointId), fields = source ? focusedFields(source, scenario) : [];
      return `<div class="api-param"><span>${esc(p.name)} <b>request source</b></span><span class="api-symbolic">Choose a provided project value or data returned by an earlier request.</span><label>Value source<select data-dependency-mode="${esc(p.name)}"><option value="">Choose a source…</option><option value="context"${currentMode === "context" ? " selected" : ""}>Project context</option><option value="request"${currentMode === "request" ? " selected" : ""}>Earlier API request</option></select></label>${currentMode === "context" ? contextFields : ""}${currentMode === "request" ? `<label>Earlier request<select data-dependency="${esc(p.name)}"><option value="">Choose a request…</option>${options.map((x) => `<option value="${x.i}"${selected === x.i ? " selected" : ""}>${esc(x.e.title)}</option>`).join("")}</select></label>${source ? `<fieldset class="api-dependency-fields"><legend>Response field(s) to use</legend>${fields.map((f) => `<label><input type="checkbox" data-dependency-path="${esc(p.name)}" value="${esc(f.path)}"${request.dependencies[p.name]?.paths?.includes(f.path) ? " checked" : ""}> <code>${esc(f.path)}</code></label>`).join("")}</fieldset>` : ""}` : ""}<em>${esc(p.description)} Use the documentation above to choose the data source and response field(s).</em></div>`;
    }
    const options = requests.map((r, i) => ({ r, i, e: map.get(r.endpointId) })).filter((x) => x.i < index && x.e);
    const selected = request.dependencies?.[p.name]?.fromRequest;
    const source = requests[selected] && map.get(requests[selected].endpointId);
    const fields = source ? focusedFields(source, scenario) : [];
    return `<div class="api-param"><span>${esc(p.name)} <b>runtime value</b></span><span class="api-symbolic">${esc(p.in === "path" ? "Path resource" : "Related response data")} · supplied by the application at run time</span><label>Earlier request<select data-dependency="${esc(p.name)}"><option value="">Choose a request…</option>${options.map((x) => `<option value="${x.i}"${selected === x.i ? " selected" : ""}>${esc(x.e.title)}</option>`).join("")}</select></label>${source ? `<fieldset class="api-dependency-fields"><legend>Response field(s) to use</legend>${fields.map((f) => `<label><input type="checkbox" data-dependency-path="${esc(p.name)}" value="${esc(f.path)}"${request.dependencies[p.name]?.paths?.includes(f.path) ? " checked" : ""}> <code>${esc(f.path)}</code></label>`).join("")}</fieldset>` : ""}<em>${esc(p.description)} Use the response documentation above to choose the field(s).</em></div>`;
  }
  if (runtimeParam(p) && p.in === "path") return `<div class="api-param"><strong>${esc(p.name)} <b>runtime path value</b></strong><span class="api-symbolic">The application supplies this identifier when a user selects the resource. No value needs to be entered.</span><em>${esc(p.description)}</em></div>`;
  if (runtimeParam(p)) return `<label class="api-param"><span>${esc(p.name)} <b>runtime value</b> <small>${esc(p.in)}</small></span><span class="api-symbolic">The application supplies this selected resource or user input at run time.</span><label class="api-runtime-choice"><input type="checkbox" data-runtime="${esc(p.name)}"${val(request.parameters[p.name]) ? " checked" : ""}> Use the application-supplied value</label><em>${esc(p.description)}</em></label>`;
  if (p.name === "X-Goog-FieldMask" || p.name.toLowerCase() === "fields") return fieldMaskControl(map.get(request.endpointId), request, p, config);
  if (presentationFor(map.get(request.endpointId), p) === "location") return locationControl(scenario, request, p, variants);
  if (p.type === "object") {
    const shape = variants[0]?.value || exampleParameter(scenario, request, p.name);
    if (shape && !containsReference(shape)) {
      if (!object(request.parameters[p.name]) || !Object.keys(request.parameters[p.name]).length) request.parameters[p.name] = JSON.parse(JSON.stringify(shape));
      const supplied = scalarPaths(shape).map(([path, value]) => `${path}: ${value}`).join(" · ");
      return `<div class="api-param"><strong>${esc(p.name)} <b>application-supplied value</b></strong><span class="api-symbolic">The project provides this structured value; no JSON or coordinate entry is needed.</span><p class="api-supplied-value">${esc(supplied)}</p><em>${esc(p.description)}</em></div>`;
    }
    const currentShape = object(request.parameters[p.name]) ? request.parameters[p.name] : blankShape(shape || {});
    const inputs = scalarPaths(shape || {}).map(([path, sample]) => { const current = getPath(currentShape, path); return `<label class="api-structured-field"><span>${esc(path)}</span><input data-structured="${esc(p.name)}" data-structured-path="${esc(path)}" type="${typeof sample === "number" ? "number" : "text"}"${typeof sample === "number" ? ' step="any"' : ""} value="${esc(current)}" placeholder="Project value"></label>`; }).join("");
    return `<div class="api-param"><strong>${esc(p.name)} <b>structured ${p.required ? "required" : "optional"} input</b></strong><span class="api-symbolic">${esc(p.in)} · set the documented data fields; this is not a resource ID.</span><div class="api-structured-fields">${inputs}</div><em>${esc(p.description)}</em></div>`;
  }
  const current = request.parameters[p.name];
  const choiceOptions = config.choiceOptions?.[p.name];
  if (choiceOptions?.length) {
    const serialized = (value) => Array.isArray(value) ? JSON.stringify(value) : String(value);
    const currentValue = serialized(current);
    return `<label class="api-param"><span>${esc(p.name)} ${p.required ? "<b>required</b>" : "<i>optional</i>"} <small>${esc(p.in)} · ${esc(p.type)}</small></span><select data-param-choice="${esc(p.name)}"><option value="">Choose…</option>${choiceOptions.map((value) => `<option value="${esc(serialized(value))}"${currentValue === serialized(value) ? " selected" : ""}>${esc(Array.isArray(value) ? value.join(", ") : value)}</option>`).join("")}</select><em>${esc(p.description)}</em></label>`;
  }
  let control;
  if (presentationFor(map.get(request.endpointId), p) === "multi") return multiChoiceControl(p, request, config);
  else if (p.name === "market" && config.marketOptions) control = `<select data-param="${esc(p.name)}"><option value="">Choose a market…</option>${config.marketOptions.map((v) => `<option value="${esc(v)}"${current === v ? " selected" : ""}>${esc(v)}</option>`).join("")}</select>`;
  else if (p.allowedValues?.length) control = `<select data-param="${esc(p.name)}"><option value="">Choose…</option>${p.allowedValues.map((v) => `<option value="${esc(v)}"${String(current) === String(v) ? " selected" : ""}>${esc(v)}</option>`).join("")}</select>`;
  else if (p.type === "boolean") control = `<select data-param="${esc(p.name)}"><option value="">Choose…</option><option value="true"${current === true ? " selected" : ""}>true</option><option value="false"${current === false ? " selected" : ""}>false</option></select>`;
  else if (p.type === "integer" && p.name === "maxResultCount") control = `<select data-param="${esc(p.name)}"><option value="">Choose…</option>${Array.from({ length: (p.maximum || 20) - (p.minimum || 1) + 1 }, (_, i) => i + (p.minimum || 1)).map((v) => `<option value="${v}"${String(current) === String(v) ? " selected" : ""}>${v} result${v === 1 ? "" : "s"}</option>`).join("")}</select>`;
  else if (p.type === "array<string>" && /type|price/i.test(p.name + p.description)) {
    const values = p.name.includes("price") ? ["PRICE_LEVEL_FREE", "PRICE_LEVEL_INEXPENSIVE", "PRICE_LEVEL_MODERATE", "PRICE_LEVEL_EXPENSIVE", "PRICE_LEVEL_VERY_EXPENSIVE"] : ["restaurant", "cafe", "museum", "park", "hotel", "library"];
    const selectedArray = Array.isArray(current) ? current : [];
    control = `<select data-param-array="${esc(p.name)}"><option value="">Choose…</option>${values.map((v) => `<option value="${esc(v)}"${selectedArray.includes(v) ? " selected" : ""}>${esc(v)}</option>`).join("")}</select>`;
  }
  else control = `<input data-param="${esc(p.name)}" type="${["integer","number"].includes(p.type) ? "number" : "text"}"${["integer","number"].includes(p.type) ? ` step="${p.type === "integer" ? "1" : "any"}"` : ""}${p.minimum != null ? ` min="${p.minimum}"` : ""}${p.maximum != null ? ` max="${p.maximum}"` : ""} value="${esc(Array.isArray(current) ? current.join(", ") : current)}" placeholder="${p.type === "array<string>" ? "Separate values with commas" : p.required ? "Required choice" : "Optional"}">`;
  return `<label class="api-param"><span>${esc(p.name)} ${p.required ? "<b>required</b>" : "<i>optional</i>"} <small>${esc(p.in)} · ${esc(p.type)}</small></span>${control}<em>${esc(p.description)}</em></label>`;
}
function requestHtml(requests, map, scenario) {
  if (!requests.length) return `<p class="muted">No requests yet. Add an operation from the documentation above.</p>`;
  return requests.map((r, i) => { const e = map.get(r.endpointId), groups = classification(scenario, e), config = presentation(scenario, e);
    const auto = groups.automatic.map((name) => { const spec = Object.entries(config.automatic || {}).find(([path]) => path === name || path.startsWith(`${name}.`))?.[1]; return `<li><code>${esc(name)}</code> — ${esc(spec?.reason || (spec?.kind === "runtime" ? "Supplied at run time by the application" : "Required documented setting"))}</li>`; }).join("");
    return `<article class="api-request" data-request="${i}"><div class="api-request-head"><span class="api-step">${i + 1}</span><div><strong>${method(e)} ${esc(e.path)}</strong><small>${esc(e.title)}</small></div><button type="button" class="secondary api-remove" data-remove="${i}">Remove Request</button></div><div class="api-request-params">${e.parameters.filter((p) => groups.assessed.includes(p.name)).map((p) => controlsFor(p, r, i, requests, scenario, map)).join("") || `<p class="muted">No settings to choose for this request.</p>`}</div>${auto ? `<details class="api-handled"><summary>Handled by the application</summary><ul>${auto}</ul></details>` : ""}</article>`; }).join("");
}
function readablePlan(plan, map) {
  const find = (value, out = []) => { if (object(value) && "$fromStep" in value) out.push(value); else if (object(value)) Object.values(value).forEach((v) => find(v, out)); else if (Array.isArray(value)) value.forEach((v) => find(v, out)); return out; };
  return `<div class="api-readable-plan">${plan.steps.map((s, i) => { const e = map.get(s.endpointId), runtime = [], settings = [], fields = [], deps = []; for (const [name, v] of Object.entries(s.parameters)) { const p = e.parameters.find((x) => x.name === name), refs = find(v); if (refs.length) deps.push(`${name} comes from ${refs.map((ref) => ref.path).join(", ")} in an earlier response`); else if (p?.name === "X-Goog-FieldMask" || p?.name === "fields") fields.push(...String(v).split(",").map((x) => x.trim())); else if (p && runtimeParam(p)) runtime.push(name); else settings.push(`${name}: ${typeof v === "object" ? JSON.stringify(v) : v}`); } return `<article class="api-readable-request"><h4>Request ${i + 1} — ${esc(e.title)}</h4><p><strong>Method:</strong> ${esc(e.method)} <code>${esc(e.path)}</code></p>${s.purpose ? `<p><strong>Purpose:</strong> ${esc(s.purpose)}</p>` : ""}${runtime.length ? `<p><strong>Runtime inputs:</strong> ${runtime.map(esc).join(", ")} supplied by the application.</p>` : ""}${settings.length ? `<p><strong>Application settings:</strong> ${settings.map(esc).join(" · ")}</p>` : ""}${fields.length ? `<p><strong>Information requested:</strong> ${fields.map((x) => `<code>${esc(x)}</code>`).join(", ")}</p>` : ""}${deps.length ? `<p><strong>Dependencies:</strong> ${deps.map(esc).join("; ")}.</p>` : ""}<p><strong>Why this request is needed:</strong> It provides documented response data used by the application.</p><details class="api-technical-preview"><summary>View Actual API Request</summary><pre>${esc(JSON.stringify({ method: e.method, path: e.path, parameters: s.parameters }, null, 2))}</pre></details></article>`; }).join("")}</div>`;
}
function feedbackHtml(result, scenario, diagnostics, attempts) {
  if (result.correct) return `<strong>✓ Project Complete</strong><p>Solved in ${attempts} ${attempts === 1 ? "check" : "checks"}. ${esc(result.efficient ? "Your plan meets the project requirements." : "Your plan works; a simpler plan may also meet the requirements.")}</p><p class="api-explanation"><strong>Why it works:</strong> ${esc(scenario.explanation.summary)} ${scenario.explanation.keyIdeas.map(esc).join(" ")}</p><p class="muted">Your completed request plan remains above for review.</p>`;
  const [primary, secondary] = diagnostics;
  return `<strong>Needs Revision — Attempt ${attempts}</strong>${primary ? `<h3>What needs attention</h3><p>${esc(primary.message)}</p><h3>What to review</h3><p>${esc(primary.review)}</p>` : ""}${secondary ? `<details class="api-secondary-diagnostic"><summary>Also check</summary><p>${esc(secondary.message)}</p></details>` : ""}<p class="api-next-step"><strong>Next step:</strong> Revise your plan and check again.</p>`;
}
export function mount({ root, controls, tracker }) {
  const state = { stopped: false, data: null, scenario: null, plan: [], picker: null, instance: null, closed: false, providerId: "all", attempts: 0, hintsUsed: {}, lastResult: null };
  const set = (id, html) => { const el = root.querySelector(`#${id}`); if (el) el.innerHTML = html; };
  const stat = () => { const el = document.getElementById("stats"); if (el && controls.roundSummary) el.textContent = controls.roundSummary(); };
  const clearStaleFeedback = () => { if (state.lastResult) { state.lastResult = null; const feedback = document.getElementById("feedback"); feedback.hidden = true; feedback.innerHTML = ""; } const hint = root.querySelector("#api-hint-text"); if (hint) hint.textContent = ""; };
  const touch = () => { clearStaleFeedback(); if (state.instance && tracker.status(state.instance) === "active") tracker.interact(state.instance); updateHintButton(); };
  const next = () => controls.next();
  const currentDiagnostics = () => {
    const result = validatePlan(state.data, state.scenario, { requests: state.plan });
    return result.correct ? [] : formativeDiagnostics(state.data, state.scenario, result, state.plan);
  };
  const updateHintButton = () => {
    const button = root.querySelector("#api-get-hint"), diagnostic = currentDiagnostics()[0];
    if (button) { button.hidden = state.closed; button.disabled = !diagnostic || (state.hintsUsed[diagnostic.id] || 0) >= 3; }
  };
  const showActionButtons = () => { controls.submit.textContent = "Check My Plan"; controls.show.textContent = "Show Answer"; controls.show.hidden = false; controls.show.disabled = false; controls.skip.textContent = "Skip"; controls.skip.hidden = false; controls.nextButton.textContent = "Next Project →"; controls.nextButton.hidden = true; controls.submit.hidden = false; controls.submit.disabled = false; controls.skip.disabled = false; };
  const renderBrief = () => {
    const s = state.scenario, p = providerFor(state.data, s);
    const constraints = s.constraints.map(studentConstraint).filter(Boolean);
    set("blocks", `<section class="api-project-goal"><h2>${esc(s.title)}</h2><h3>Goal</h3><p>${esc(studentGoal(s))}</p><h3>Required information</h3><ul>${s.requirements.map((r) => `<li>${esc(studentRequirement(s, r))}</li>`).join("")}</ul><h3>Constraints</h3><ul>${constraints.map((c) => `<li>${esc(c)}</li>`).join("")}</ul><p class="api-provider"><strong>Provider:</strong> ${esc(p.name)} · <a href="${esc(p.documentationUrl)}" target="_blank" rel="noreferrer">Official API documentation ↗</a></p>${HTTP_REFERENCE}</section>`);
  };
  const renderPlan = () => {
    const map = endpointMap(state.data);
    set("interaction", `<section class="api-plan"><div class="api-plan-head"><h2>My Request Plan</h2><p class="muted">Design the requests and information the application would need. The game simulates the plan; technical request formatting is optional.</p><p id="api-request-status" class="api-request-status" role="status">${state.lastAddedEndpoint ? `${esc(map.get(state.lastAddedEndpoint)?.title)} added to your plan.` : ""}</p><p id="api-attempt-status" class="api-request-status">${state.attempts ? `Checks so far: ${state.attempts}.` : ""}</p></div><div id="api-plan-list">${requestHtml(state.plan, map, state.scenario)}</div><p class="api-plan-note">Some projects need one request; others connect data from earlier responses. The order you add independent requests does not affect the result.</p><div class="api-hint-tools"><button id="api-get-hint" type="button" class="secondary">Get Hint</button><p id="api-hint-text" role="status" aria-live="polite" aria-atomic="true"></p></div></section>`);
    root.querySelectorAll("[data-request]").forEach((card) => {
      const i = Number(card.dataset.request);
      card.querySelectorAll("[data-param]").forEach((input) => { input.oninput = input.onchange = () => { const raw = input.value, parameter = map.get(state.plan[i].endpointId).parameters.find((p) => p.name === input.dataset.param); state.plan[i].parameters[input.dataset.param] = ["integer", "number"].includes(parameter.type) ? (raw === "" ? "" : Number(raw)) : input.tagName === "SELECT" && ["true","false"].includes(raw) ? raw === "true" : parameter.type === "array<string>" ? raw.split(",").map((x) => x.trim()).filter(Boolean) : raw; touch(); }; });
      card.querySelectorAll("[data-param-choice]").forEach((select) => { select.onchange = () => { const raw = select.value, parameter = map.get(state.plan[i].endpointId).parameters.find((p) => p.name === select.dataset.paramChoice); if (!raw) delete state.plan[i].parameters[select.dataset.paramChoice]; else { try { state.plan[i].parameters[select.dataset.paramChoice] = parameter.type === "array<string>" ? JSON.parse(raw) : raw === "true" ? true : raw === "false" ? false : !Number.isNaN(Number(raw)) && raw.trim() !== "" ? Number(raw) : raw; } catch { state.plan[i].parameters[select.dataset.paramChoice] = raw; } } touch(); }; });
      card.querySelectorAll("[data-param-array]").forEach((select) => { select.onchange = () => { state.plan[i].parameters[select.dataset.paramArray] = select.value ? [select.value] : []; touch(); }; });
      card.querySelectorAll("[data-param-multi]").forEach((checkbox) => { checkbox.onchange = () => { const name = checkbox.dataset.paramMulti, parameter = map.get(state.plan[i].endpointId).parameters.find((p) => p.name === name), values = [...card.querySelectorAll(`[data-param-multi=\"${CSS.escape(name)}\"]:checked`)].map((x) => x.value); state.plan[i].parameters[name] = serializeMultiSelection(parameter, values); touch(); }; });
      card.querySelectorAll("[data-field-mask]").forEach((checkbox) => { checkbox.onchange = () => { const name = checkbox.dataset.fieldMask; state.plan[i].parameters[name] = [...card.querySelectorAll(`[data-field-mask=\"${CSS.escape(name)}\"]:checked`)].map((x) => x.value).join(","); touch(); }; });
      card.querySelectorAll("[data-location-radius]").forEach((select) => { select.onchange = () => { const name = select.dataset.locationRadius; state.plan[i].parameters[name] = putPath(state.plan[i].parameters[name], "circle.radius", select.value === "" ? "" : Number(select.value)); touch(); }; });
      card.querySelectorAll("[data-origin-source]").forEach((select) => { select.onchange = () => {
        const r = state.plan[i]; delete r.dependencies.origin;
        const choices = presentation(state.scenario, map.get(r.endpointId)).originOptions || {};
        if (choices[select.value]) r.parameters.origin = structuredClone(choices[select.value]);
        else if (select.value === "request") { delete r.parameters.origin; r.dependencies.origin = { source: "request", fromRequest: null, paths: [] }; }
        else delete r.parameters.origin;
        touch(); renderPlan();
      }; });
      card.querySelectorAll("[data-structured]").forEach((input) => { input.oninput = () => { const name = input.dataset.structured, value = input.type === "number" ? (input.value === "" ? "" : Number(input.value)) : input.value; state.plan[i].parameters[name] = putPath(state.plan[i].parameters[name], input.dataset.structuredPath, value); touch(); }; });
      card.querySelectorAll("[data-runtime]").forEach((toggle) => { toggle.onchange = () => { if (toggle.checked) state.plan[i].parameters[toggle.dataset.runtime] = { $runtime: true }; else delete state.plan[i].parameters[toggle.dataset.runtime]; touch(); }; });
      card.querySelectorAll("[data-dependency-mode]").forEach((select) => { select.onchange = () => { const p = select.dataset.dependencyMode, parameter = map.get(state.plan[i].endpointId).parameters.find((x) => x.name === p), variants = parameterVariants(state.scenario, state.plan[i], parameter); if (!select.value) { delete state.plan[i].dependencies[p]; delete state.plan[i].parameters[p]; } else if (select.value === "context") { const variant = variants[0]; state.plan[i].dependencies[p] = { source: "context", shape: variant?.shape || "" }; state.plan[i].parameters[p] = blankShape(variant?.value || {}); } else { state.plan[i].dependencies[p] = { source: "request", fromRequest: null, paths: [] }; delete state.plan[i].parameters[p]; } touch(); renderPlan(); }; });
      card.querySelectorAll("[data-dependency-shape]").forEach((select) => { select.onchange = () => { const p = select.dataset.dependencyShape, parameter = map.get(state.plan[i].endpointId).parameters.find((x) => x.name === p), variant = parameterVariants(state.scenario, state.plan[i], parameter).find((x) => x.shape === select.value); state.plan[i].dependencies[p].shape = select.value; state.plan[i].parameters[p] = blankShape(variant?.value || {}); touch(); renderPlan(); }; });
      card.querySelectorAll("[data-dependency]").forEach((select) => { select.onchange = () => { const p = select.dataset.dependency; if (!select.value) { if (state.plan[i].dependencies[p]) state.plan[i].dependencies[p] = { source: "request", fromRequest: null, paths: [] }; delete state.plan[i].parameters[p]; } else { state.plan[i].dependencies[p] = { source: "request", fromRequest: Number(select.value), paths: [] }; state.plan[i].parameters[p] = { $runtime: true }; } touch(); renderPlan(); }; });
      card.querySelectorAll("[data-dependency-path]").forEach((checkbox) => { checkbox.onchange = () => { const p = checkbox.dataset.dependencyPath, dep = state.plan[i].dependencies[p]; if (!dep) return; dep.paths = [...card.querySelectorAll(`[data-dependency-path="${CSS.escape(p)}"]:checked`)].map((x) => x.value); touch(); }; });
      const remove = card.querySelector("[data-remove]"); remove.onclick = () => { state.plan.splice(i, 1); state.plan.forEach((r) => { for (const d of Object.values(r.dependencies || {})) if (d.fromRequest > i) d.fromRequest--; else if (d.fromRequest === i) d.invalid = true; }); touch(); renderPlan(); renderDocs(); };
    });
    const hintButton = root.querySelector("#api-get-hint");
    hintButton.onclick = () => {
      const diagnostic = currentDiagnostics()[0];
      if (!diagnostic) { root.querySelector("#api-hint-text").textContent = "Your current plan appears to meet the requirements. Check it to record your result."; return; }
      const level = state.hintsUsed[diagnostic.id] || 0;
      if (level >= 3) return;
      root.querySelector("#api-hint-text").textContent = `Hint ${level + 1}: ${diagnostic.hints[level]}`;
      state.hintsUsed[diagnostic.id] = level + 1; updateHintButton(); if (state.instance) tracker.interact(state.instance);
    };
    updateHintButton();
  };
  const renderDocs = (query = "") => {
    const s = state.scenario, p = providerFor(state.data, s), endpoints = endpointsFor(state.data, s).filter((e) => `${e.title} ${e.path} ${e.description} ${e.method}`.toLowerCase().includes(query.toLowerCase()));
    const filters = `<label class="api-provider-filter">Projects <select id="api-provider-filter"><option value="all">All Projects</option>${state.data.providers.map((v) => `<option value="${esc(v.id)}"${v.id === state.providerId ? " selected" : ""}>${esc(PROVIDER_LABELS[v.id] || v.name)}</option>`).join("")}</select></label>`;
    set("docs", `<section class="api-docs-browser"><div class="api-docs-head"><div><h2>Browse API Documentation</h2><p class="muted">Read the learning-focused reference and select the operations your application needs.</p></div><div class="api-browse-controls">${filters}<label class="api-search">Search endpoints <input id="api-search" type="search" placeholder="Search title, path, or description" value="${esc(query)}"></label></div></div><div class="api-entry-list">${endpoints.map((e) => docsHtml(e, p, s)).join("") || `<p class="muted">No matching endpoints. Try another search.</p>`}</div></section>`);
    const search = root.querySelector("#api-search"); search.oninput = () => { const query = search.value; renderDocs(query); const restored = root.querySelector("#api-search"); restored.focus(); restored.setSelectionRange(query.length, query.length); };
    root.querySelector("#api-provider-filter").onchange = (event) => { state.providerId = event.target.value; nextChallenge(); };
    for (const b of root.querySelectorAll("[data-add]")) b.onclick = () => { const endpointId = b.dataset.add, endpoint = endpointMap(state.data).get(endpointId), occurrence = state.plan.filter((request) => request.endpointId === endpointId).length; state.plan.push({ endpointId, parameters: automaticParametersForOccurrence(s, endpoint, occurrence), dependencies: {} }); state.lastAddedEndpoint = endpointId; touch(); renderPlan(); root.querySelector("#interaction")?.scrollIntoView({ block: "start", behavior: "smooth" }); };
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
    state.plan = []; state.lastAddedEndpoint = null; state.closed = false; state.attempts = 0; state.hintsUsed = {}; state.lastResult = null; state.instance = tracker.begin("documentation-lab", "Documentation Lab", `api-project/${state.scenario.id}`, state.scenario.title);
    document.getElementById("mode-label").textContent = ""; document.getElementById("family").textContent = "";
    document.getElementById("instructions").innerHTML = "<strong>You're designing a request plan, not building a working app.</strong> Use the documentation to decide which API requests an application would need. The game simulates the requests; you don't need an account, API key, or programming code.";
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

export { presentationFor, fieldMaskChoices, serializeMultiSelection };
