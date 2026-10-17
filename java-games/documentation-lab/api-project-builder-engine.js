/* API Project Builder Stage 1 engine. No DOM access. */
export const GAME_ID = "documentation-lab";
export const MODE_ID = "api-builder";
export const MODE_TITLE = "API Project Builder";
export const DATA_FILE = "./api-project-data-v1.json";
const clone = (x) => JSON.parse(JSON.stringify(x));
const arr = (v) => Array.isArray(v);
const text = (v) => typeof v === "string" && v.trim().length > 0;
const unique = (values, path, errors) => { const seen = new Set(); for (const value of values) { if (seen.has(value)) errors.push(path + ": duplicate id " + value); seen.add(value); } };
export function validateApiData(data) {
  const errors = [];
  if (!data || typeof data !== "object") return ["top level must be an object"];
  if (data.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!arr(data.providers) || !arr(data.scenarios)) return errors.concat("providers and scenarios must be arrays");
  const providers = data.providers, pids = providers.map((p) => p && p.id);
  unique(pids, "providers", errors);
  const endpoints = new Map();
  for (const p of providers) {
    if (!p || !text(p.id) || !text(p.name) || !text(p.documentationUrl) || !text(p.verifiedDate) || !text(p.notes) || !arr(p.endpoints)) { errors.push("provider " + ((p && p.id) || "?") + ": missing required field"); continue; }
    unique(p.endpoints.map((e) => e && e.id), "provider " + p.id + " endpoints", errors);
    for (const e of p.endpoints) {
      if (!e || !text(e.id) || !text(e.method) || !text(e.path) || !text(e.title) || !text(e.description) || !arr(e.parameters) || !arr(e.responseFields) || !e.authentication || !text(e.sourceUrl)) { errors.push("endpoint " + ((e && e.id) || "?") + ": missing required field"); continue; }
      if (endpoints.has(e.id)) errors.push("endpoints: duplicate global id " + e.id);
      endpoints.set(e.id, { ...e, providerId: p.id });
      for (const q of e.parameters) { if (!q || !text(q.name) || !text(q.location) || !text(q.type) || typeof q.required !== "boolean" || !text(q.description)) errors.push("endpoint " + e.id + ": invalid parameter"); if (q && q.allowedValues && !arr(q.allowedValues)) errors.push("endpoint " + e.id + ": allowedValues must be an array"); }
      for (const f of e.responseFields) if (!f || !text(f.path) || !text(f.type) || !text(f.description)) errors.push("endpoint " + e.id + ": invalid responseField");
    }
  }
  const sids = data.scenarios.map((s) => s && s.id); unique(sids, "scenarios", errors);
  for (const s of data.scenarios) {
    if (!s || !text(s.id) || !text(s.providerId) || !text(s.title) || !text(s.goal) || !arr(s.requirements) || !s.constraints || !arr(s.availableEndpointIds) || !arr(s.acceptedPlans) || !text(s.explanation) || !arr(s.responseSamples) || !arr(s.modelTargets)) { errors.push("scenario " + ((s && s.id) || "?") + ": missing required field"); continue; }
    if (!providers.some((p) => p.id === s.providerId)) errors.push("scenario " + s.id + ": unknown providerId " + s.providerId);
    for (const eid of s.availableEndpointIds) { const e = endpoints.get(eid); if (!e) errors.push("scenario " + s.id + ": unknown endpoint " + eid); else if (e.providerId !== s.providerId) errors.push("scenario " + s.id + ": endpoint " + eid + " belongs to another provider"); }
    if (!s.requirements.every((r) => r && text(r.id) && text(r.label) && text(r.description))) errors.push("scenario " + s.id + ": invalid requirement");
    if (s.providedIdentifiers !== undefined) {
      if (!arr(s.providedIdentifiers) || !s.providedIdentifiers.every((v) => v && text(v.name) && v.value !== undefined && text(v.description))) errors.push("scenario " + s.id + ": invalid providedIdentifier");
    }
    if (s.providedParameters !== undefined) {
      if (!s.providedParameters || typeof s.providedParameters !== "object" || arr(s.providedParameters)) errors.push("scenario " + s.id + ": providedParameters must be an object");
      else for (const [eid, values] of Object.entries(s.providedParameters)) {
        const e = endpoints.get(eid);
        if (!e) errors.push("scenario " + s.id + ": providedParameters references unknown endpoint " + eid);
        else {
          const names = new Set(e.parameters.map((q) => q.name));
          for (const name of Object.keys(values || {})) if (!names.has(name)) errors.push("scenario " + s.id + ": provided parameter " + name + " is not documented for " + eid);
        }
      }
    }
    for (const plan of s.acceptedPlans) {
      if (!plan || !text(plan.id) || !text(plan.efficiency) || !arr(plan.requests)) { errors.push("scenario " + s.id + ": invalid acceptedPlan"); continue; }
      for (const req of plan.requests) {
        if (!req || !text(req.endpointId) || !req.parameters || typeof req.parameters !== "object" || arr(req.parameters)) { errors.push("scenario " + s.id + ": invalid request"); continue; }
        const e = endpoints.get(req.endpointId); if (!e) { errors.push("scenario " + s.id + ": plan references unknown endpoint " + req.endpointId); continue; }
        if (!s.availableEndpointIds.includes(req.endpointId)) errors.push("scenario " + s.id + ": plan endpoint " + req.endpointId + " is not available");
        const names = new Set(e.parameters.map((q) => q.name));
        for (const name of Object.keys(req.parameters)) if (!names.has(name)) errors.push("scenario " + s.id + ": " + req.endpointId + " unknown parameter " + name);
        for (const q of e.parameters) if (q.required && !Object.hasOwn(req.parameters, q.name)) errors.push("scenario " + s.id + ": " + req.endpointId + " missing required parameter " + q.name);
      }
    }
    for (const sample of s.responseSamples) if (!sample || !text(sample.endpointId) || !endpoints.has(sample.endpointId) || !sample.body || typeof sample.body !== "object") errors.push("scenario " + s.id + ": invalid responseSample");
    for (const target of s.modelTargets) if (!target || !text(target.id) || !text(target.concept) || !arr(target.fields) || !arr(target.relationships || [])) errors.push("scenario " + s.id + ": invalid modelTarget");
  }
  return errors;
}
export function assertValid(data) { const errors = validateApiData(data); if (errors.length) throw new Error("Invalid API Project Builder content:\n- " + errors.join("\n- ")); return data; }
export async function loadApiContent(url = DATA_FILE, fetcher = globalThis.fetch) { if (typeof fetcher !== "function") throw new Error("A fetch function is required"); const response = await fetcher(url); if (!response.ok) throw new Error("Could not load " + url + " (" + response.status + ")"); return assertValid(await response.json()); }
export function createScenarioPicker(data, rng = Math.random) { assertValid(data); let bag = []; return () => { if (!bag.length) { bag = data.scenarios.slice(); for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; } } return clone(bag.pop()); }; }
function endpointMap(data) { return new Map(data.providers.flatMap((p) => p.endpoints.map((e) => [e.id, e]))); }
export function endpointsFor(data, scenario) { const map = endpointMap(data); return scenario.availableEndpointIds.map((id) => map.get(id)).filter(Boolean); }
function signature(r) { return r.endpointId + "|" + Object.keys(r.parameters || {}).sort().map((k) => k + "=" + JSON.stringify(r.parameters[k])).join("&"); }
function comparePlans(a, b) { const x = (a.requests || []).map(signature).sort(), y = (b.requests || []).map(signature).sort(); return x.length === y.length && x.every((v, i) => v === y[i]); }
function requestValidation(scenario, request, map) {
  const e = map.get(request.endpointId), errors = [], missing = [], invalid = [];
  if (!e) return { errors: ["This endpoint is not in the documentation for this project."], missing, invalid, unknownEndpoint: true };
  if (!scenario.availableEndpointIds.includes(e.id)) errors.push("This endpoint is not available for this project.");
  const allowed = new Map(e.parameters.map((p) => [p.name, p]));
  for (const name of Object.keys(request.parameters || {})) if (!allowed.has(name)) { errors.push("Parameter " + name + " is not documented for this endpoint."); invalid.push(name); }
  for (const p of e.parameters) {
    const value = request.parameters && request.parameters[p.name];
    if (p.required && (value === undefined || value === "")) { errors.push("Required parameter " + p.name + " is missing."); missing.push(p.name); }
    if (value !== undefined && value !== "" && p.allowedValues && !p.allowedValues.includes(value)) { errors.push(p.name + " must use a documented value."); invalid.push(p.name); }
    if (value !== undefined && value !== "" && p.type === "integer" && (!Number.isInteger(Number(value)) || (p.min != null && Number(value) < p.min) || (p.max != null && Number(value) > p.max))) { errors.push(p.name + " must be a documented integer range."); invalid.push(p.name); }
  }
  return { errors, missing, invalid, unknownEndpoint: false };
}
export function validatePlan(data, scenario, plan) {
  const map = endpointMap(data), requests = (plan && plan.requests || []).map((r) => ({ endpointId: r.endpointId, parameters: { ...(r.parameters || {}) } })), errors = [], incompleteRequests = [], invalidParameterRequests = [];
  for (const r of requests) {
    const check = requestValidation(scenario, r, map);
    errors.push(...check.errors);
    if (check.missing.length) incompleteRequests.push(r.endpointId);
    if (check.invalid.length) invalidParameterRequests.push(r.endpointId);
  }
  const exact = scenario.acceptedPlans.filter((p) => comparePlans({ requests }, p));
  if (exact.length) {
    const best = exact.find((p) => p.efficiency === "smallest-sufficient") || exact[0];
    return { correct: true, valid: true, efficient: best.efficiency === "smallest-sufficient", status: best.efficiency === "smallest-sufficient" ? "correct" : "valid-less-efficient", matchedPlanId: best.id, errors, missing: [], unnecessary: [], incorrectEndpoints: [], incorrectParameters: [], incompleteRequests: [], invalidParameterRequests: [], message: best.efficiency === "smallest-sufficient" ? "This is the smallest sufficient request plan." : "This plan can work, but it includes an unnecessary request for this goal." };
  }
  const expected = scenario.acceptedPlans.map((p) => p.requests), allExpectedIds = new Set(expected.flat().map((r) => r.endpointId));
  const incorrectEndpoints = requests.filter((r) => !allExpectedIds.has(r.endpointId)).map((r) => r.endpointId);
  const incorrectParameters = [];
  for (const r of requests) { const matches = expected.flat().filter((e) => e.endpointId === r.endpointId); if (matches.length && !matches.some((e) => JSON.stringify(e.parameters) === JSON.stringify(r.parameters))) incorrectParameters.push(r.endpointId); }
  const best = scenario.acceptedPlans.map((p) => ({ p, score: p.requests.filter((w) => requests.some((r) => signature(r) === signature(w))).length })).sort((a, b) => b.score - a.score)[0];
  const incorrectSet = new Set(incorrectParameters);
  const missing = best ? best.p.requests.filter((w) => !incorrectSet.has(w.endpointId) && !requests.some((r) => signature(r) === signature(w))) : [];
  const unnecessary = requests.filter((r) => !incorrectSet.has(r.endpointId) && (!best || !best.p.requests.some((w) => signature(w) === signature(r))));
  if (errors.length) {
    const incomplete = [...new Set(incompleteRequests)], invalid = [...new Set(invalidParameterRequests)];
    return { correct: false, valid: false, efficient: false, status: incomplete.length && !invalid.length ? "incomplete-requests" : "invalid-parameters", errors, missing, unnecessary: [], incorrectEndpoints, incorrectParameters: invalid, incompleteRequests: incomplete, invalidParameterRequests: invalid, message: incomplete.length && !invalid.length ? "Complete the required parameter values for the selected request." : "Check the parameter values against the API documentation." };
  }
  if (incorrectParameters.length) return { correct: false, valid: false, efficient: false, status: "incorrect-parameters", errors, missing, unnecessary, incorrectEndpoints, incorrectParameters, incompleteRequests: [], invalidParameterRequests: [], message: "An appropriate endpoint was selected, but its parameter value does not match the project or the documented solution." };
  return { correct: false, valid: false, efficient: false, status: "incomplete-or-incorrect", errors, missing, unnecessary, incorrectEndpoints, incorrectParameters, incompleteRequests: [], invalidParameterRequests: [], message: missing.length ? "The plan is missing a request needed to supply one or more requirements." : "The selected requests do not provide the required information." };
}
export function requestFor(endpointId, parameters = {}) { return { endpointId, parameters: { ...parameters } }; }
