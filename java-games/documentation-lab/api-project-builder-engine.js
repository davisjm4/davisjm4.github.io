/* API Project Builder: schema-v1 content adapter, normalizer, and scorer. */
export const GAME_ID = "documentation-lab";
export const MODE_ID = "api-builder";
export const MODE_TITLE = "API Project Builder";
export const DATA_FILE = "./api-project-data-v1.json?v=verified-library-v2";
const arr = Array.isArray;
const obj = (v) => !!v && typeof v === "object" && !arr(v);
const str = (v) => typeof v === "string" && !!v.trim();
const uniq = (xs, where, errors) => { const seen = new Set(); for (const x of xs) { if (seen.has(x)) errors.push(`${where}: duplicate id ${x}`); seen.add(x); } };
const copy = (v) => JSON.parse(JSON.stringify(v));

export function validateApiData(data) {
  const errors = [];
  if (!obj(data)) return ["top level must be an object"];
  if (data.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!arr(data.providers) || !arr(data.scenarios)) return errors.concat("providers and scenarios must be arrays");
  uniq(data.providers.map((p) => p?.id), "providers", errors);
  const providers = new Map(), endpoints = new Map();
  for (const p of data.providers) {
    if (!obj(p) || !str(p.id) || !str(p.name) || !str(p.documentationUrl) || !str(p.verifiedDate) || !(str(p.notes) || arr(p.notes)) || !arr(p.endpoints)) { errors.push(`provider ${p?.id || "?"}: invalid required fields`); continue; }
    providers.set(p.id, p); uniq(p.endpoints.map((e) => e?.id), `provider ${p.id} endpoints`, errors);
    for (const e of p.endpoints) {
      if (!obj(e) || !str(e.id) || !str(e.method) || !str(e.path) || !str(e.title) || !str(e.description) || !arr(e.parameters) || !obj(e.authentication) || !arr(e.responseFields) || !str(e.sourceUrl)) { errors.push(`endpoint ${e?.id || "?"}: invalid required fields`); continue; }
      if (endpoints.has(e.id)) errors.push(`endpoints: duplicate global id ${e.id}`);
      endpoints.set(e.id, { endpoint: e, providerId: p.id });
      const names = new Set();
      for (const q of e.parameters) { if (!obj(q) || !str(q.name) || !["path", "query", "header", "body"].includes(q.in) || !str(q.type) || typeof q.required !== "boolean" || !str(q.description)) errors.push(`endpoint ${e.id}: invalid parameter`); if (q?.name && names.has(q.name)) errors.push(`endpoint ${e.id}: duplicate parameter ${q.name}`); if (q?.name) names.add(q.name); if (q?.allowedValues !== undefined && !arr(q.allowedValues)) errors.push(`endpoint ${e.id}: ${q.name} allowedValues must be an array`); }
      for (const f of e.responseFields) if (!obj(f) || !str(f.path) || !str(f.type) || !str(f.description)) errors.push(`endpoint ${e.id}: invalid response field`);
      for (const r of e.parameterRules || []) if (!obj(r) || !["exactlyOne", "atLeastOne", "atMostOne", "requiresValue"].includes(r.rule) || !arr(r.parameters)) errors.push(`endpoint ${e.id}: invalid parameter rule`);
    }
  }
  uniq(data.scenarios.map((s) => s?.id), "scenarios", errors);
  for (const s of data.scenarios) {
    if (!obj(s) || !str(s.id) || !str(s.providerId) || !str(s.title) || !str(s.goal) || !arr(s.requirements) || !arr(s.constraints) || !arr(s.availableEndpointIds) || !arr(s.acceptedPlans) || !obj(s.explanation) || !arr(s.responseSamples) || !obj(s.modelTargets)) { errors.push(`scenario ${s?.id || "?"}: invalid required fields`); continue; }
    if (!providers.has(s.providerId)) errors.push(`scenario ${s.id}: unknown providerId ${s.providerId}`);
    for (const r of s.requirements) if (!obj(r) || !str(r.id) || !str(r.description)) errors.push(`scenario ${s.id}: invalid requirement`);
    for (const id of s.availableEndpointIds) { const ref = endpoints.get(id); if (!ref) errors.push(`scenario ${s.id}: unknown endpoint ${id}`); else if (ref.providerId !== s.providerId) errors.push(`scenario ${s.id}: endpoint ${id} belongs to another provider`); }
    if (!s.acceptedPlans.length) errors.push(`scenario ${s.id}: requires an accepted plan`);
    for (const plan of s.acceptedPlans) {
      if (!obj(plan) || !str(plan.id) || !arr(plan.steps) || !plan.steps.length) { errors.push(`scenario ${s.id}: invalid accepted plan`); continue; }
      const stepRefs = new Map();
      for (const step of plan.steps) {
        const ref = endpoints.get(step?.endpointId);
        if (!obj(step) || !Number.isInteger(step.step) || !ref || !s.availableEndpointIds.includes(step.endpointId) || !obj(step.parameters)) { errors.push(`scenario ${s.id}/${plan.id}: invalid plan step`); continue; }
        stepRefs.set(step.step, ref.endpoint);
        const params = new Map(ref.endpoint.parameters.map((p) => [p.name, p]));
        for (const [name, value] of Object.entries(step.parameters)) { if (!params.has(name)) errors.push(`scenario ${s.id}/${plan.id}: ${step.endpointId} unknown parameter ${name}`); if (obj(value) && "$fromStep" in value) { const src = stepRefs.get(value.$fromStep); if (!src || value.$fromStep >= step.step) errors.push(`scenario ${s.id}/${plan.id}: invalid dependency at step ${step.step}`); else if (!src.responseFields.some((f) => f.path === value.path || f.path.replace(/\[\]/g, "") === String(value.path).replace(/\[\]/g, ""))) errors.push(`scenario ${s.id}/${plan.id}: dependency field ${value.path} is undocumented`); } }
        for (const p of ref.endpoint.parameters) if (p.required && !Object.hasOwn(step.parameters, p.name)) errors.push(`scenario ${s.id}/${plan.id}: ${step.endpointId} missing required ${p.name}`);
      }
      for (const step of plan.conditionalSteps || []) if (!endpoints.has(step.endpointId) || !str(step.condition) || !obj(step.parameters)) errors.push(`scenario ${s.id}/${plan.id}: invalid conditional step`);
    }
    for (const sample of s.responseSamples) if (!obj(sample) || !endpoints.has(sample.endpointId) || !obj(sample.body)) errors.push(`scenario ${s.id}: invalid response sample`);
    for (const rejected of s.rejectedPlans || []) if (!arr(rejected.endpointIds) || !str(rejected.reason) || rejected.endpointIds.some((id) => !endpoints.has(id))) errors.push(`scenario ${s.id}: invalid rejected plan`);
  }
  return errors;
}
export function assertValid(data) { const errors = validateApiData(data); if (errors.length) throw new Error("Invalid API Project Builder content:\n- " + errors.join("\n- ")); return data; }
export async function loadApiContent(url = DATA_FILE, fetcher = globalThis.fetch) { if (typeof fetcher !== "function") throw new Error("A fetch function is required"); const response = await fetcher(url); if (!response.ok) throw new Error(`Could not load ${url} (${response.status})`); return assertValid(await response.json()); }
export function isProductionContent(data) { return !data?.developmentOnly && data?.schemaVersion === 1 && data.providers?.length >= 3 && data.scenarios?.length >= 1 && data.providers.every((p) => p.verifiedDate && p.documentationUrl); }
export function endpointMap(data) { return new Map(data.providers.flatMap((p) => p.endpoints.map((e) => [e.id, e]))); }
export function endpointsFor(data, scenario) { const map = endpointMap(data); return scenario.availableEndpointIds.map((id) => map.get(id)).filter(Boolean); }
export function providerFor(data, scenario) { return data.providers.find((p) => p.id === scenario.providerId); }
export function createScenarioPicker(data, rng = Math.random) { assertValid(data); const seen = new Map(); return (providerId = "all") => { let bag = seen.get(providerId) || []; const pool = data.scenarios.filter((s) => providerId === "all" || s.providerId === providerId); if (!pool.length) return null; if (!bag.length) { bag = pool.slice(); for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; } const last = seen.get(`${providerId}:last`); if (bag.length > 1 && bag.at(-1)?.id === last) [bag[0], bag[bag.length - 1]] = [bag.at(-1), bag[0]]; } const result = bag.pop(); seen.set(providerId, bag); seen.set(`${providerId}:last`, result.id); return copy(result); }; }

export function isRuntimeParameter(parameter, value) { return parameter.in === "path" || (obj(value) && "$fromStep" in value) || /(^id$|id$|_id$|^forhandle$|^forusername$|^name$)/i.test(parameter.name) && parameter.allowedValues == null; }
const valueAt = (o, path) => path.split(".").reduce((v, k) => v?.[k], o);
const hasVal = (v) => { if (v === undefined || v === null || v === "") return false; if (obj(v)) { if (v.$runtime === true) return true; const values = Object.values(v); return values.length > 0 && values.every(hasVal); } if (arr(v)) return v.length > 0 && v.every(hasVal); return true; };
function equivalentValue(actual, expected, runtime) { if (runtime && obj(expected) && "$fromStep" in expected) return obj(actual) && Number.isInteger(actual.fromRequest) && actual.fromRequest >= 0; if (runtime) return true; return JSON.stringify(actual) === JSON.stringify(expected); }
function findRefs(value, out = []) { if (obj(value) && "$fromStep" in value) out.push(value); else if (obj(value)) Object.values(value).forEach((v) => findRefs(v, out)); else if (arr(value)) value.forEach((v) => findRefs(v, out)); return out; }
function validateRules(endpoint, parameters) {
  const errors = [];
  for (const rule of endpoint.parameterRules || []) {
    const set = rule.parameters.filter((name) => hasVal(parameters[name]));
    if (rule.rule === "exactlyOne" && set.length !== 1) errors.push(`Choose exactly one of ${rule.parameters.join(", ")}.`);
    if (rule.rule === "atLeastOne" && set.length < 1) errors.push(`Choose at least one of ${rule.parameters.join(", ")}.`);
    if (rule.rule === "atMostOne" && set.length > 1) errors.push(`Choose no more than one of ${rule.parameters.join(", ")}.`);
    if (rule.rule === "requiresValue") for (const name of set) { const wanted = rule.requires?.[name]; if (wanted !== undefined && !(arr(wanted) ? wanted : [wanted]).includes(parameters[name])) errors.push(`${name} requires ${rule.description || "a related parameter value"}.`); }
  }
  for (const p of endpoint.parameters) { const v = parameters[p.name], implicitlySupplied = isRuntimeParameter(p) && p.in === "path"; if (p.required && !hasVal(v) && !implicitlySupplied) errors.push(`Required ${p.name} is missing.`); if (hasVal(v) && p.allowedValues && !(p.format === "comma-separated" ? String(v).split(",").map((x) => x.trim()).every((x) => p.allowedValues.includes(x)) : p.allowedValues.includes(v))) errors.push(`${p.name} must use documented value(s).`); if (hasVal(v) && typeof v === "number" && ((p.minimum != null && v < p.minimum) || (p.maximum != null && v > p.maximum))) errors.push(`${p.name} is outside the documented range.`); }
  return errors;
}
function acceptedMatch(scenario, requests, map) {
  for (const plan of scenario.acceptedPlans) {
    if (requests.length < plan.steps.length) continue;
    const unmatched = requests.map((r, i) => ({ r, i })); let ok = true;
    for (let si = 0; si < plan.steps.length; si++) {
      const step = plan.steps[si], e = map.get(step.endpointId), ix = unmatched.findIndex(({ r }) => r.endpointId === step.endpointId && Object.keys(r.parameters || {}).every((name) => Object.hasOwn(step.parameters, name)) && Object.entries(step.parameters).every(([name, expected]) => { const p = e.parameters.find((q) => q.name === name); if (findRefs(expected).length) return true; return equivalentValue(r.parameters?.[name], expected, p && isRuntimeParameter(p, expected)); }));
      if (ix < 0) { ok = false; break; }
      const selected = unmatched[ix];
      for (const [name, expected] of Object.entries(step.parameters)) { const refs = findRefs(expected); if (!refs.length) continue;
        const dep = selected.r.dependencies?.[name], expectedPaths = refs.map((ref) => ref.path), sourceSteps = refs.map((ref) => plan.steps.findIndex((v) => v.step === ref.$fromStep)), sources = sourceSteps.map((si) => requests.findIndex((r) => r.endpointId === plan.steps[si]?.endpointId));
        const actualPaths = arr(dep?.paths) ? dep.paths : dep?.path ? [dep.path] : [];
        if (!obj(dep) || sources.some((source) => source !== dep.fromRequest || source >= selected.i) || JSON.stringify([...actualPaths].sort()) !== JSON.stringify([...expectedPaths].sort())) ok = false;
      }
      unmatched.splice(ix, 1);
    }
      if (ok) {
        const conditional = plan.conditionalSteps || [];
        const extrasValid = unmatched.every(({ r }) => conditional.some((step) => {
          if (step.endpointId !== r.endpointId) return false;
          const e = map.get(step.endpointId);
          if (!Object.keys(r.parameters || {}).every((name) => Object.hasOwn(step.parameters, name))) return false;
          return Object.entries(step.parameters).every(([name, expected]) => { if (findRefs(expected).length) return true; const p = e.parameters.find((q) => q.name === name); return equivalentValue(r.parameters?.[name], expected, p && isRuntimeParameter(p, expected)); });
        }));
        if (extrasValid) return plan;
      }
  }
  return null;
}
export function validatePlan(data, scenario, submission) {
  const map = endpointMap(data), requests = (submission?.requests || []).map((r) => ({ endpointId: r.endpointId, parameters: { ...(r.parameters || {}) }, dependencies: { ...(r.dependencies || {}) } }));
  const byId = new Map(), incompleteRequests = [], invalidParameterRequests = [], errors = [], requestValidity = new Map();
  for (const r of requests) { byId.set(r.endpointId, (byId.get(r.endpointId) || 0) + 1); const e = map.get(r.endpointId); if (!e || !scenario.availableEndpointIds.includes(r.endpointId)) { errors.push({ endpointId: r.endpointId, reason: "This request is not in the documentation for this project." }); continue; } const problems = validateRules(e, r.parameters); if (problems.length) { errors.push(...problems.map((reason) => ({ endpointId: r.endpointId, reason }))); invalidParameterRequests.push(r.endpointId); } const missing = e.parameters.some((p) => p.required && !(isRuntimeParameter(p) && p.in === "path") && !hasVal(r.parameters[p.name])); if (missing) incompleteRequests.push(r.endpointId); requestValidity.set(r.endpointId, problems.length === 0 && !missing); }
  const matched = !errors.length && !incompleteRequests.length ? acceptedMatch(scenario, requests, map) : null;
  const human = (id) => map.get(id)?.title || id;
  if (matched) return { correct: true, valid: true, efficient: matched.preferred !== false, status: matched.preferred === false ? "valid-less-efficient" : "correct", matchedPlanId: matched.id, errors: [], missing: [], unnecessary: [], incorrectEndpoints: [], incorrectParameters: [], incompleteRequests: [], invalidParameterRequests: [], incorrectlyConfiguredRequests: [], message: matched.preferred === false ? "This plan can meet the goal, though another valid plan uses fewer or less costly requests." : "This plan meets the project requirements." };
  const plans = scenario.acceptedPlans;
  const scored = plans.map((p) => { const missing = p.steps.filter((s) => !requests.some((r) => r.endpointId === s.endpointId)); const extras = requests.filter((r) => !p.steps.some((s) => s.endpointId === r.endpointId)); const same = requests.filter((r) => p.steps.some((s) => s.endpointId === r.endpointId)).length; return { p, missing, extras, same }; }).sort((a, b) => b.same - a.same || a.missing.length - b.missing.length || a.extras.length - b.extras.length);
  const best = scored[0], present = new Set(requests.map((r) => r.endpointId));
  const missing = best.p.steps.filter((s) => !present.has(s.endpointId)).map((s) => ({ endpointId: s.endpointId }));
  const invalidIds = new Set([...incompleteRequests, ...invalidParameterRequests]);
  const incorrectEndpoints = requests.filter((r) => !map.has(r.endpointId) || !scenario.availableEndpointIds.includes(r.endpointId)).map((r) => ({ endpointId: r.endpointId }));
  const incorrectIds = new Set(incorrectEndpoints.map((r) => r.endpointId));
  const unnecessary = requests.filter((r) => !best.p.steps.some((s) => s.endpointId === r.endpointId) && !invalidIds.has(r.endpointId) && !incorrectIds.has(r.endpointId)).map((r) => ({ endpointId: r.endpointId }));
  const incorrectlyConfiguredRequests = requests.filter((r) => !invalidIds.has(r.endpointId) && !incorrectIds.has(r.endpointId) && !plans.some((plan) => plan.steps.some((step) => {
    if (step.endpointId !== r.endpointId) return false;
    const e = map.get(step.endpointId), requestIndex = requests.indexOf(r);
    if (!Object.keys(r.parameters || {}).every((name) => Object.hasOwn(step.parameters, name))) return false;
    return Object.entries(step.parameters).every(([name, expected]) => {
      const refs = findRefs(expected);
      if (refs.length) {
        const dep = r.dependencies?.[name], paths = refs.map((ref) => ref.path), sourceIndices = refs.map((ref) => { const sourceStep = plan.steps.find((x) => x.step === ref.$fromStep); return requests.findIndex((x) => x.endpointId === sourceStep?.endpointId); });
        return !!dep && sourceIndices.every((source) => source === dep.fromRequest && source < requestIndex) && JSON.stringify([...(dep.paths || [])].sort()) === JSON.stringify([...paths].sort());
      }
      const param = e.parameters.find((x) => x.name === name);
      return equivalentValue(r.parameters?.[name], expected, param && isRuntimeParameter(param, expected));
    });
  }))).map((r) => ({ endpointId: r.endpointId }));
  const status = incompleteRequests.length ? "incomplete-requests" : invalidParameterRequests.length ? "invalid-parameters" : missing.length ? "missing-requests" : unnecessary.length ? "unnecessary-requests" : incorrectlyConfiguredRequests.length ? "incorrect-parameters" : incorrectEndpoints.length ? "incorrect-endpoints" : "incorrect-plan";
  const rejected = (scenario.rejectedPlans || []).find((p) => {
    if (JSON.stringify([...p.endpointIds].sort()) !== JSON.stringify(requests.map((r) => r.endpointId).sort())) return false;
    if (!p.parameters || !Object.keys(p.parameters).length) return true;
    const actual = new Map();
    const collect = (value) => { if (obj(value)) for (const [key, child] of Object.entries(value)) { actual.set(key, child); collect(child); } };
    requests.forEach((r) => collect(r.parameters));
    return Object.entries(p.parameters).every(([key, value]) => {
      const param = requests.map((r) => endpointMap(data).get(r.endpointId)?.parameters.find((x) => x.name === key)).find(Boolean);
      if (param && isRuntimeParameter(param, value)) return true;
      return actual.has(key) && JSON.stringify(actual.get(key)) === JSON.stringify(value);
    });
  });
  return { correct: false, valid: false, efficient: false, status, errors, missing, unnecessary, incorrectEndpoints, incorrectParameters: invalidParameterRequests, incompleteRequests: [...new Set(incompleteRequests)], invalidParameterRequests: [...new Set(invalidParameterRequests)], incorrectlyConfiguredRequests, rejectedReason: rejected?.reason || "", message: status === "incomplete-requests" ? "Complete the meaningful parameter choices for these requests. Required resource IDs are supplied by the application at run time." : status === "invalid-parameters" ? "One or more parameter values do not match the documented API rules." : status === "missing-requests" ? "Add the request or requests that provide the remaining project information." : status === "unnecessary-requests" ? "Some requests are not needed for this project's requirements." : status === "incorrect-parameters" ? "One or more requests use the wrong meaningful parameter choices." : "Review the request choices and how their response data supports the project." };
}
const FORMATIVE_MESSAGES = {
  missing: "Your plan does not yet retrieve all the information the application needs. Compare the project requirements with response fields available from your selected requests.",
  incomplete: "A selected request still needs a required documented value. Review its parameter list and descriptions.",
  parameters: "One or more parameter choices do not match the information or constraints in the project goal. Review the documented meanings and allowed values.",
  fieldMask: "The application needs information that is not currently requested in the response fields. Review how this API selects returned fields.",
  dependency: "One request needs an identifier that another request may provide. Review where that identifier comes from.",
  unnecessary: "Your plan may retrieve some information more than once. Compare the response fields of your selected requests.",
  access: "One selected operation has an access restriction that may prevent this application from using it. Review its authorization and availability notes.",
  operation: "A selected operation may not provide information this project needs. Compare its documented response fields with the project brief."
};
const HINTS = {
  missing: [
    "Recheck every item under Required information in the project brief and compare it with the responses your plan can return.",
    "Review the Response fields section for each selected operation and match the documented data to the project requirements.",
    "A collection request and a request for one item can return different information. Related resources may also require connected requests."
  ],
  incomplete: [
    "Check which documented choices or values the project goal makes necessary.",
    "Review required parameters, their locations, and any allowed values or ranges.",
    "Some request values change which resource is returned; others filter, rank, or limit the results."
  ],
  parameters: [
    "Revisit the filters, time period, ordering, and limits described in the project goal.",
    "Compare each configured value with the parameter description and documented allowed values.",
    "A parameter can change the kind of result or its time window even when the endpoint itself is appropriate."
  ],
  fieldMask: [
    "Check that the planned responses include each kind of information listed in the project brief.",
    "Review the documentation section explaining how this API selects returned fields.",
    "A field mask controls which documented fields the service returns; it needs to cover the information the application displays."
  ],
  dependency: [
    "Check whether the needed identifier is already in the project brief or must come from an earlier response.",
    "Review the earlier operation's response fields for an identifier that can connect the requests.",
    "When one response supplies an identifier for another request, the data relationship and request order matter."
  ],
  unnecessary: [
    "Compare the response information from each selected operation with the project requirements.",
    "Look for response fields that overlap across your selected requests.",
    "A collection response may already contain information that would otherwise require repeated item requests."
  ],
  access: [
    "Recheck the project's stated login, token, API key, or project availability limits.",
    "Review the selected operation's authorization requirements and availability notes.",
    "An operation can be documented yet unavailable to an application using a different authorization method or project setup."
  ],
  operation: [
    "Compare the information still needed by the project with what the selected operation returns.",
    "Review that operation's response fields and the distinction between a collection and one item.",
    "An endpoint can be valid API documentation and still return a different resource or level of detail than the application needs."
  ]
};
function hasAccessConflict(scenario, endpoint, request = {}) {
  const constraints = Array.isArray(scenario.constraints) ? scenario.constraints.join(" ") : String(scenario.constraints || "");
  const text = constraints.toLowerCase(), auth = endpoint.authentication || {};
  if ((endpoint.availability === "legacy" || endpoint.availability?.status === "legacy") && /new\b[^.]{0,80}\bproject/.test(text)) return true;
  if (auth.type === "api_key_or_oauth2" && /public data only|no viewer login|no user login/.test(text) && ["mine", "myRating", "forMine"].some((name) => hasVal(request.parameters?.[name]) && request.parameters[name] !== false)) return true;
  if (auth.type === "oauth2" && /no (?:user )?login|app-only|public data only/.test(text) && !(auth.tokenTypes || []).includes("client_credentials")) return true;
  const requiredScopes = auth.scopes || [];
  const scenarioScopes = [...text.matchAll(/\b[a-z]+(?:-[a-z]+){1,5}\b/g)].map((m) => m[0]);
  return requiredScopes.length > 0 && scenarioScopes.some((scope) => /(?:read|write|private|public|top|follow|email)/.test(scope)) && requiredScopes.some((scope) => !scenarioScopes.includes(scope));
}
function fieldMaskMismatch(scenario, endpoint, request) {
  const maskParam = endpoint.parameters.find((p) => p.name.toLowerCase() === "x-goog-fieldmask");
  if (!maskParam) return false;
  const expected = scenario.acceptedPlans.flatMap((plan) => plan.steps.filter((step) => step.endpointId === endpoint.id).map((step) => step.parameters[maskParam.name]).filter((v) => typeof v === "string"));
  return expected.length > 0 && !expected.includes(request.parameters?.[maskParam.name]);
}
function dependencyMismatch(scenario, requests, requestIndex, request) {
  const plans = scenario.acceptedPlans.filter((plan) => plan.steps.some((step) => step.endpointId === request.endpointId && Object.values(step.parameters).some((v) => findRefs(v).length)));
  if (!plans.length) return false;
  return plans.every((plan) => {
    const step = plan.steps.find((s) => s.endpointId === request.endpointId && Object.values(s.parameters).some((v) => findRefs(v).length));
    if (!step) return true;
    return Object.entries(step.parameters).filter(([, value]) => findRefs(value).length).some(([name, value]) => {
      const refs = findRefs(value), dep = request.dependencies?.[name];
      return refs.some((ref) => {
        const sourceStep = plan.steps.find((s) => s.step === ref.$fromStep), sourceIndex = requests.findIndex((r) => r.endpointId === sourceStep?.endpointId);
        return !dep || dep.fromRequest !== sourceIndex || sourceIndex < 0 || sourceIndex >= requestIndex || !(dep.paths || []).includes(ref.path);
      });
    });
  });
}
export function formativeDiagnostics(data, scenario, result, submittedRequests = []) {
  const map = endpointMap(data), requests = submittedRequests || [], issues = new Set(), maskIds = new Set();
  for (let i = 0; i < requests.length; i++) {
    const request = requests[i], endpoint = map.get(request.endpointId);
    if (!endpoint) { issues.add("operation"); continue; }
    if (hasAccessConflict(scenario, endpoint, request)) issues.add("access");
    if (fieldMaskMismatch(scenario, endpoint, request)) { issues.add("fieldMask"); maskIds.add(endpoint.id); }
    if (dependencyMismatch(scenario, requests, i, request)) issues.add("dependency");
  }
  if (result.incompleteRequests.some((id) => !maskIds.has(id))) issues.add("incomplete");
  if (result.invalidParameterRequests.some((id) => !maskIds.has(id))) issues.add("parameters");
  if (result.incorrectlyConfiguredRequests.some(({ endpointId }) => {
    if (maskIds.has(endpointId)) return false;
    const i = requests.findIndex((r) => r.endpointId === endpointId), endpoint = map.get(endpointId);
    return !endpoint || !dependencyMismatch(scenario, requests, i, requests[i]) && !hasAccessConflict(scenario, endpoint, requests[i]);
  })) issues.add("parameters");
  if (result.missing.length) issues.add("missing");
  if (result.unnecessary.length) issues.add("unnecessary");
  if (result.incorrectEndpoints.length) issues.add("operation");
  if (!issues.size) issues.add("missing");
  const order = ["access", "dependency", "fieldMask", "incomplete", "parameters", "missing", "unnecessary", "operation"];
  return order.filter((key) => issues.has(key)).map((key) => ({ key, message: FORMATIVE_MESSAGES[key], hints: HINTS[key] }));
}
export function preferredPlan(scenario) { return scenario.acceptedPlans.find((p) => p.preferred) || scenario.acceptedPlans[0]; }
export function planFromAccepted(scenario, plan = preferredPlan(scenario)) { return { requests: plan.steps.map((step) => ({ endpointId: step.endpointId, parameters: Object.fromEntries(Object.entries(step.parameters).filter(([name, value]) => { const e = scenario.availableEndpointIds; return !obj(value) || !("$fromStep" in value); })), dependencies: {} })) }; }
