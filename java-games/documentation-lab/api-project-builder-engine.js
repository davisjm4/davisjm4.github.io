/* API Project Builder: schema-v1 content adapter, normalizer, and scorer. */
import { presentation } from "./api-project-presentation.js";
export const GAME_ID = "documentation-lab";
export const MODE_ID = "api-builder";
export const MODE_TITLE = "API Project Builder";
export const DATA_FILE = "./api-project-data-v1-runtime-index.json?v=verified-library-v2";
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
      for (const q of e.parameters) { if (!obj(q) || !str(q.name) || !["path", "query", "header", "body", "form"].includes(q.in) || !str(q.type) || typeof q.required !== "boolean" || !str(q.description)) errors.push(`endpoint ${e.id}: invalid parameter`); if (q?.name && names.has(q.name)) errors.push(`endpoint ${e.id}: duplicate parameter ${q.name}`); if (q?.name) names.add(q.name); if (q?.allowedValues !== undefined && !arr(q.allowedValues)) errors.push(`endpoint ${e.id}: ${q.name} allowedValues must be an array`); }
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
    if (!s.acceptedPlans.length && s.expectedOutcome !== "no-valid-plan") errors.push(`scenario ${s.id}: requires an accepted plan`);
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
    for (const sample of s.responseSamples) if (!obj(sample) || !endpoints.has(sample.endpointId) || (sample.body !== null && !obj(sample.body) && !arr(sample.body))) errors.push(`scenario ${s.id}: invalid response sample`);
    for (const rejected of s.rejectedPlans || []) if (!arr(rejected.endpointIds) || !str(rejected.reason) || rejected.endpointIds.some((id) => !endpoints.has(id))) errors.push(`scenario ${s.id}: invalid rejected plan`);
  }
  return errors;
}
export function assertValid(data) { const errors = validateApiData(data); if (errors.length) throw new Error("Invalid API Project Builder content:\n- " + errors.join("\n- ")); return data; }
export async function loadApiContent(url = DATA_FILE, fetcher = globalThis.fetch) { if (typeof fetcher !== "function") throw new Error("A fetch function is required"); const response = await fetcher(url); if (!response.ok) throw new Error(`Could not load ${url} (${response.status})`); const parsed = await response.json(); if (!Array.isArray(parsed.runtimeParts)) return assertValid(parsed); const base = new URL(url, globalThis.location?.href || "https://davisjm4.github.io/java-games/documentation-lab/"); const parts = await Promise.all(parsed.runtimeParts.map(async (part) => { const partResponse = await fetcher(new URL(part, base).href); if (!partResponse.ok) throw new Error(`Could not load ${part} (${partResponse.status})`); return partResponse.json(); })); return assertValid({ schemaVersion: parsed.schemaVersion, providers: parts.flatMap((part) => part.providers), scenarios: parts.flatMap((part) => part.scenarios) }); }
export function isProductionContent(data) { return !data?.developmentOnly && data?.schemaVersion === 1 && data.providers?.length >= 3 && data.scenarios?.length >= 1 && data.providers.every((p) => p.verifiedDate && p.documentationUrl); }
export function endpointMap(data) { return new Map(data.providers.flatMap((p) => p.endpoints.map((e) => [e.id, e]))); }
export function endpointsFor(data, scenario) { const map = endpointMap(data); return scenario.availableEndpointIds.map((id) => map.get(id)).filter(Boolean); }
export function providerFor(data, scenario) { return data.providers.find((p) => p.id === scenario.providerId); }
export function createScenarioPicker(data, rng = Math.random) { assertValid(data); const seen = new Map(); return (providerId = "all") => { let bag = seen.get(providerId) || []; const pool = data.scenarios.filter((s) => (s.stage1Compatible === undefined || (s.stage1Compatible === true && !(s.engineSupportRequired || []).length)) && (providerId === "all" || s.providerId === providerId)); if (!pool.length) return null; const last = seen.get(`${providerId}:last`), lastScenario = pool.find((s) => s.id === last); if (!bag.length) { bag = pool.slice(); for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; } if (bag.length > 1 && lastScenario) { const equivalent = (s) => s.scenarioTemplateId && s.scenarioTemplateId === lastScenario.scenarioTemplateId || s.reasoningFamily && s.reasoningFamily === lastScenario.reasoningFamily; const ix = bag.findIndex(equivalent); if (ix >= 0 && ix === bag.length - 1) [bag[0], bag[ix]] = [bag[ix], bag[0]]; } } let ix = bag.length - 1; if (bag.length > 1 && lastScenario) { const equivalent = (s) => s.scenarioTemplateId && s.scenarioTemplateId === lastScenario.scenarioTemplateId || s.reasoningFamily && s.reasoningFamily === lastScenario.reasoningFamily; const safe = bag.findIndex((s) => !equivalent(s)); if (safe >= 0) ix = safe; } const result = bag.splice(ix, 1)[0]; seen.set(providerId, bag); seen.set(`${providerId}:last`, result.id); return copy(result); }; }

export function isRuntimeParameter(parameter, value) { return (obj(value) && "$runtime" in value) || (parameter.in === "path" && !parameter.allowedValues?.length) || (obj(value) && "$fromStep" in value) || /(^id$|id$|_id$|^forhandle$|^forusername$|^name$)/i.test(parameter.name) && parameter.allowedValues == null; }
const valueAt = (o, path) => path.split(".").reduce((v, k) => v?.[k], o);
const hasVal = (v) => { if (v === undefined || v === null || v === "") return false; if (obj(v)) { if (v.$runtime === true) return true; const values = Object.values(v); return values.length > 0 && values.every(hasVal); } if (arr(v)) return v.length > 0 && v.every(hasVal); return true; };
const containsRuntime = (value) => obj(value) && Object.hasOwn(value, "$runtime") || (obj(value) && Object.values(value).some(containsRuntime)) || (arr(value) && value.some(containsRuntime));
const containsReference = (value) => obj(value) && Object.hasOwn(value, "$fromStep") || (obj(value) && Object.values(value).some(containsReference)) || (arr(value) && value.some(containsReference));
const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function assessmentMatches(actual, expected, assessment, parameter) {
  if (!assessment || assessment.mode === "exact") return equivalentValue(actual, expected, false, parameter);
  if (assessment.mode === "notAssessed") return hasVal(actual);
  if (assessment.mode === "structural") return containsRuntime(actual) || containsReference(actual);
  if (assessment.mode === "oneOf") return (assessment.values || []).some((value) => deepEqual(actual, value));
  if (assessment.mode === "includesAll") { const actualValues = arr(actual) ? actual : typeof actual === "string" ? actual.split(",").map((v) => v.trim()).filter(Boolean) : []; return (assessment.values || []).flatMap((value) => arr(value) ? value : [value]).every((value) => actualValues.some((actualValue) => deepEqual(actualValue, value))); }
  return equivalentValue(actual, expected, false, parameter);
}
function sameRuntimeShape(actual, expected) {
  if (obj(expected) && "$runtime" in expected) return obj(actual) && "$runtime" in actual;
  if (arr(expected)) return arr(actual) && actual.length === expected.length && expected.every((value, index) => sameRuntimeShape(actual[index], value));
  if (obj(expected)) return obj(actual) && Object.keys(actual).length === Object.keys(expected).length && Object.entries(expected).every(([key, value]) => Object.hasOwn(actual, key) && sameRuntimeShape(actual[key], value));
  return Object.is(actual, expected);
}
function equivalentValue(actual, expected, runtime, parameter) {
  if (containsRuntime(expected)) return sameRuntimeShape(actual, expected);
  if (runtime && obj(expected) && "$fromStep" in expected) return obj(actual) && Number.isInteger(actual.fromRequest) && actual.fromRequest >= 0;
  if (runtime) return true;
  if (typeof actual === "string" && typeof expected === "string" && actual.includes("places.") && expected.includes("places.")) {
    const fields = (value) => new Set(value.split(",").map((part) => part.trim()).filter(Boolean));
    const a = fields(actual), e = fields(expected);
    if (a.size === e.size && [...a].every((field) => e.has(field))) return true;
    const withoutOptionalId = (set) => new Set([...set].filter((field) => field !== "places.id"));
    const aWithoutId = withoutOptionalId(a), eWithoutId = withoutOptionalId(e);
    if (aWithoutId.size === eWithoutId.size && [...aWithoutId].every((field) => eWithoutId.has(field))) return true;
  }
  // Comma-separated API lists are sets. The UI orders selections by the documented
  // values; the verified accepted plan may list the same parts in a different order.
  if (parameter?.format === "comma-separated" && typeof actual === "string" && typeof expected === "string") {
    const a = new Set(actual.split(",").map((x) => x.trim()).filter(Boolean));
    const e = new Set(expected.split(",").map((x) => x.trim()).filter(Boolean));
    return a.size === e.size && [...a].every((x) => e.has(x));
  }
  return JSON.stringify(actual) === JSON.stringify(expected);
}
function findRefs(value, out = []) { if (obj(value) && "$fromStep" in value) out.push(value); else if (obj(value)) Object.values(value).forEach((v) => findRefs(v, out)); else if (arr(value)) value.forEach((v) => findRefs(v, out)); return out; }
function findRefBindings(value, path = [], out = []) { if (obj(value) && "$fromStep" in value) out.push({ targetPath: path.join("."), fromStep: value.$fromStep, path: value.path }); else if (obj(value)) Object.entries(value).forEach(([key, child]) => findRefBindings(child, [...path, key], out)); else if (arr(value)) value.forEach((child, index) => findRefBindings(child, [...path, String(index)], out)); return out; }
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
      const step = plan.steps[si], e = map.get(step.endpointId), ix = unmatched.findIndex(({ r }) => r.endpointId === step.endpointId && Object.keys(r.parameters || {}).every((name) => Object.hasOwn(step.parameters, name)) && Object.entries(step.parameters).every(([name, expected]) => { const p = e.parameters.find((q) => q.name === name), assessment = step.assessment?.[name], actual = r.parameters?.[name]; if (findRefs(expected).length) return true; const input = presentation(scenario, e).automatic?.[name]?.kind === "runtime" && (actual === undefined || containsRuntime(actual)); return assessmentMatches(actual, expected, assessment, p) || input || (actual === undefined && p && isRuntimeParameter(p, expected)); }));
      if (ix < 0) { ok = false; break; }
      const selected = unmatched[ix];
      for (const [name, expected] of Object.entries(step.parameters)) { const refs = findRefBindings(expected); if (!refs.length) continue;
        const dep = selected.r.dependencies?.[name], expectedBindings = refs.map((ref) => ({ targetPath: ref.targetPath, path: ref.path, fromRequest: requests.findIndex((r) => r.endpointId === plan.steps[plan.steps.findIndex((v) => v.step === ref.fromStep)]?.endpointId) }));
        const actualBindings = arr(dep?.bindings) ? dep.bindings.map((binding) => ({ targetPath: binding.targetPath, path: binding.path, fromRequest: binding.fromRequest })) : null;
        const multiSource = new Set(expectedBindings.map((binding) => binding.fromRequest)).size > 1;
        if (multiSource) {
          const normalize = (bindings) => JSON.stringify([...(bindings || [])].map((binding) => `${binding.targetPath}|${binding.fromRequest}|${binding.path}`).sort());
          if (!obj(dep) || normalize(actualBindings) !== normalize(expectedBindings) || expectedBindings.some((binding) => binding.fromRequest < 0 || binding.fromRequest >= selected.i)) ok = false;
        } else {
          const expectedPaths = refs.map((ref) => ref.path), source = expectedBindings[0]?.fromRequest;
          const actualPaths = arr(dep?.paths) ? dep.paths : dep?.path ? [dep.path] : [];
          if (!obj(dep) || source !== dep.fromRequest || source < 0 || source >= selected.i || JSON.stringify([...actualPaths].sort()) !== JSON.stringify([...expectedPaths].sort())) ok = false;
        }
      }
      unmatched.splice(ix, 1);
    }
      if (ok) {
        const conditional = plan.conditionalSteps || [];
        const extrasValid = unmatched.every(({ r }) => conditional.some((step) => {
          if (step.endpointId !== r.endpointId) return false;
          const e = map.get(step.endpointId);
          if (!Object.keys(r.parameters || {}).every((name) => Object.hasOwn(step.parameters, name))) return false;
          return Object.entries(step.parameters).every(([name, expected]) => { if (findRefs(expected).length) return true; const p = e.parameters.find((q) => q.name === name), assessment = step.assessment?.[name], actual = r.parameters?.[name]; const input = presentation(scenario, e).automatic?.[name]?.kind === "runtime" && (actual === undefined || containsRuntime(actual)); return assessmentMatches(actual, expected, assessment, p) || input || (actual === undefined && p && isRuntimeParameter(p, expected)); });
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
        const dep = r.dependencies?.[name], bindings = findRefBindings(expected).map((ref) => ({ targetPath: ref.targetPath, path: ref.path, fromRequest: requests.findIndex((x) => x.endpointId === plan.steps.find((step) => step.step === ref.fromStep)?.endpointId) }));
        if (new Set(bindings.map((binding) => binding.fromRequest)).size > 1) return !dep || JSON.stringify([...(dep.bindings || [])].map((binding) => `${binding.targetPath}|${binding.fromRequest}|${binding.path}`).sort()) !== JSON.stringify(bindings.map((binding) => `${binding.targetPath}|${binding.fromRequest}|${binding.path}`).sort()) || bindings.some((binding) => binding.fromRequest >= requestIndex);
        const paths = refs.map((ref) => ref.path), source = bindings[0]?.fromRequest;
        return !!dep && (source !== dep.fromRequest || source >= requestIndex || JSON.stringify([...(dep.paths || [])].sort()) !== JSON.stringify([...paths].sort()));
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
  const actual = String(request.parameters?.[maskParam.name] || "").split(",").map((value) => value.trim()).filter(Boolean);
  const actualSet = new Set(actual);
  const candidates = scenario.acceptedPlans.flatMap((plan) => plan.steps.filter((step) => step.endpointId === endpoint.id).map((step) => ({ value: step.parameters[maskParam.name], assessment: step.assessment?.[maskParam.name] }))).filter((item) => typeof item.value === "string");
  return candidates.length > 0 && !candidates.some(({ value, assessment }) => {
    const expected = value.split(",").map((item) => item.trim()).filter(Boolean), expectedSet = new Set(expected);
    if (assessment?.mode === "includesAll") return (assessment.values || []).flatMap((item) => arr(item) ? item : [item]).every((item) => actualSet.has(item));
    if (actualSet.size === expectedSet.size && [...expectedSet].every((item) => actualSet.has(item))) return true;
    if (endpoint.id.startsWith("maps.") && expectedSet.has("places.id")) {
      const withoutId = (set) => new Set([...set].filter((item) => item !== "places.id"));
      const a = withoutId(actualSet), e = withoutId(expectedSet);
      return a.size === e.size && [...e].every((item) => a.has(item));
    }
    return false;
  });
}
function dependencyMismatch(scenario, requests, requestIndex, request) {
  const plans = scenario.acceptedPlans.filter((plan) => plan.steps.some((step) => step.endpointId === request.endpointId && Object.values(step.parameters).some((v) => findRefs(v).length)));
  if (!plans.length) return false;
  return plans.every((plan) => {
    const step = plan.steps.find((s) => s.endpointId === request.endpointId && Object.values(s.parameters).some((v) => findRefs(v).length));
    if (!step) return true;
    return Object.entries(step.parameters).filter(([, value]) => findRefs(value).length).some(([name, value]) => {
      const refs = findRefBindings(value), dep = request.dependencies?.[name];
      const bindings = refs.map((ref) => ({ targetPath: ref.targetPath, path: ref.path, fromRequest: requests.findIndex((r) => r.endpointId === plan.steps.find((step) => step.step === ref.fromStep)?.endpointId) }));
      if (new Set(bindings.map((binding) => binding.fromRequest)).size > 1) {
        const actual = dep?.bindings || [];
        return bindings.some((binding) => binding.fromRequest < 0 || binding.fromRequest >= requestIndex || !actual.some((candidate) => candidate.targetPath === binding.targetPath && candidate.path === binding.path && candidate.fromRequest === binding.fromRequest));
      }
      return bindings.some((binding) => !dep || dep.fromRequest !== binding.fromRequest || binding.fromRequest < 0 || binding.fromRequest >= requestIndex || !(dep.paths || []).includes(binding.path));
    });
  });
}
const SCENARIO_DIAGNOSTICS = {
  "maps-lunch-spot-finder": {
    fieldMask: (endpoint, request) => {
      const selected = new Set(String(request.parameters?.["X-Goog-FieldMask"] || "").split(",").map((v) => v.trim()));
      if (!selected.has("places.formattedAddress")) return { id: "field:address", message: "Your plan can find restaurants, but it doesn't yet request everything students need to locate each result. Compare the response data for a map pin with the information someone can read as an address.", review: "Review the documented place fields that describe a location.", hints: ["Students need both a map location and a readable way to identify where to go.", "Compare the field that gives coordinates with the field that gives a human-readable address.", "A map pin's coordinates and a formatted street address are different response values; the app needs the readable address too."] };
      if (!selected.has("places.currentOpeningHours")) return { id: "field:open-now", message: "Your plan can describe the restaurants, but it doesn't yet tell the app which ones are open at this moment. A weekly schedule and a current status are not the same kind of information.", review: "Compare the documented fields for a live open-now status and recurring hours.", hints: ["The app must help students avoid places that are closed right now.", "Look for the difference between an upcoming schedule and a status for the present moment.", "A recurring-hours field describes a schedule; current-opening information can report whether the place is open now."] };
      if (!selected.has("places.location")) return { id: "field:coordinates", message: "The app still needs the location data used to place each restaurant on the map. Check whether the selected fields include a place's coordinates.", review: "Review which documented response field supplies map coordinates.", hints: ["Students should be able to see each restaurant as a map pin.", "Compare the response fields for human-readable addresses and geographic coordinates.", "An address is readable text; a map pin needs coordinate data."] };
      return { id: "field:place-info", message: "Your response selection does not yet cover all the place information required by the app. Compare the display requirements with the documented place fields.", review: "Review which selected fields support each part of the restaurant card.", hints: ["Check every piece of information shown on a restaurant card.", "Match each display need to the response fields documented for Places.", "The response must include the distinct values the app displays, not just a restaurant's identity."] };
    },
    parameters: (name) => name === "rankPreference" ? { id: "setting:ranking", message: "The app should make the closest options easiest to choose. Revisit how the search orders its results.", review: "Compare the documented ranking choices with the app's distance-based goal.", hints: ["The goal asks students to see nearby places first.", "Compare ranking by popularity with ranking by proximity.", "The distance-based ranking option orders results by how close they are to the search location."] } : name === "maxResultCount" ? { id: "setting:count", message: "The result list should stay within the number of restaurants specified in the brief. Check the result-count setting.", review: "Review the documented limit for the number of places returned.", hints: ["The app has a stated maximum number of results.", "Find the setting that controls how many places can be returned.", "Set the cap to the maximum stated in the project goal."] } : name === "locationRestriction" ? { id: "setting:radius", message: "The search area does not yet match the distance limit in the project brief. Revisit the radius around the phone's current location.", review: "Compare the brief's distance with the documented circular search restriction.", hints: ["The goal limits how far away a restaurant can be.", "Review how the circular restriction uses a center and radius.", "The radius should match the distance stated in the project goal."] } : null
  },
  "youtube-channel-hub": {
    operation: () => ({ id: "operation:uploads", message: "The channel request can describe the creator, but the page also needs a way to reach that creator's recent uploads. Compare the channel and playlist operations in the documentation.", review: "Review the channel response's related-resource information and the operation that lists playlist entries.", hints: ["The page needs both channel information and a list of recent videos.", "A channel's uploads are exposed through a related playlist; compare what each operation returns.", "One response can provide the uploads-playlist identifier used by the playlist-items operation."] }),
    dependency: () => ({ id: "dependency:uploads", message: "The recent-video request needs to use the uploads collection identified by the channel response. Check the connection between those two results.", review: "Review the channel response fields that identify its uploads playlist.", hints: ["The second request must know which playlist belongs to the channel.", "Compare the source of the channel's uploads identifier with the playlist ID input.", "Use the uploads playlist ID returned by the channel request as the source for the playlist request."] }),
    parameters: (name, endpoint) => name === "part" && endpoint.id === "youtube.channels-list" ? { id: "setting:channel-parts", message: "The channel response is missing a related-resource section needed to reach its uploads. Compare the requested channel sections with the page's needs.", review: "Review which channel response section contains related playlists.", hints: ["The video list comes from a playlist associated with the channel.", "Look for the channel response section describing related resources.", "The channel request must include the section that returns its uploads-playlist reference."] } : name === "part" && endpoint.id === "youtube.playlistitems-list" ? { id: "setting:video-parts", message: "The video list can identify each upload, but it still needs the publication date requested by the page. Compare the requested playlist-item sections.", review: "Review the difference between when an item entered a playlist and when a video was published.", hints: ["The page asks for the date the video was published, not simply when it appeared in the playlist.", "Compare the playlist item's snippet data with its content-details data.", "Playlist-item content details include the video's publication date; snippet.publishedAt is the playlist-entry date."] } : null
  },
  "youtube-study-video-finder": {
    operation: () => ({ id: "operation:video-details", message: "Search can find matching videos, but ordinary search results do not include every value shown on these cards. Compare search results with the operation that returns video details.", review: "Review which requested card information is available from search and which comes from video details.", hints: ["The cards show more than a title and thumbnail.", "Compare the response fields available from a video search with those available from a video-details request.", "Some APIs separate discovering resources from retrieving their full details; IDs from search can connect the requests."] }),
    dependency: () => ({ id: "dependency:video-ids", message: "The details request needs the video identifiers returned by the search. Check that the connection uses video results rather than a different kind of result.", review: "Review the search response field that identifies each matching video.", hints: ["The second request should enrich the videos found by the first.", "Look at which search-result field identifies a video resource.", "Pass the video IDs from the search results into the video-details request."] })
  },
  "spotify-my-playlists-browser": {
    operation: () => ({ id: "operation:playlist-items", message: "The first request can list playlists, but it does not return the songs for the playlist the listener taps. Add the operation that reads a selected playlist's items.", review: "Compare the playlist-list response with the documented playlist-items operation.", hints: ["The second screen shows songs inside one selected playlist.", "The list response includes playlist summaries; check which operation returns their song entries.", "A separate playlist-items request retrieves the selected playlist's songs."] }),
    dependency: () => ({ id: "dependency:selected-playlist", message: "The second screen needs the identifier for the playlist the listener selected. A playlist name or a song's identifier does not identify that playlist.", review: "Review the playlist-list response for the identifier associated with each playlist card.", hints: ["The tapped playlist determines what the second screen displays.", "Compare the playlist's own identifier with fields describing a song or a playlist name.", "Connect the selected playlist's ID from the first response to the second request's playlist input."] })
  },
  "maps-museum-walk-planner": {
    operation: () => ({ id: "operation:route", message: "The place search can find and describe a museum, but it cannot calculate the walking distance and time from the hotel. The planner needs a separate route capability.", review: "Compare the Places operations with the Routes operation and their response fields.", hints: ["The plan must both identify a museum and calculate a route to it.", "Check which service returns place information and which computes route information.", "A Places search identifies the destination; a Routes request calculates the trip between locations."] }),
    dependency: () => ({ id: "dependency:museum", message: "The route destination must refer to the museum selected by the search. Check which museum information can identify the same place in the route request.", review: "Review the place-search response fields that can serve as a route destination.", hints: ["The route should end at the museum found by the search.", "Compare the route's accepted destination types with the place fields returned by search.", "Use a selected museum's place identifier or address as the route destination source."] }),
    fieldMask: (endpoint, request) => endpoint.id === "maps.routes-compute-routes" ? (() => {
      const mask = new Set(String(request.parameters?.["X-Goog-FieldMask"] || "").split(",").map((v) => v.trim()));
      if (!mask.has("routes.localizedValues")) return { id: "field:localized-route", message: "The route request can return measurements, but the planner needs ready-to-display miles and minutes. Review which response data is localized for display.", review: "Compare raw route measurements with the API's localized display values.", hints: ["The screen shows miles and minutes rather than technical measurement values.", "Review which route response contains display-ready text in the requested units.", "Localized route values provide distance and time text in the requested display units."] };
      if (!mask.has("routes.warnings")) return { id: "field:walking-warning", message: "The walking route response must include any safety warning the app needs to show. Check the documentation's walking-route note and the fields available for warnings.", review: "Review the Routes restriction for walking and the related response field.", hints: ["The walking mode has a special notice requirement in the documentation.", "Check which response field carries route warnings.", "The app must request and display the route's warnings for walking directions."] };
      return { id: "field:route-info", message: "The route response does not yet include every detail required by the planner. Compare its display needs with the documented route fields.", review: "Review the route fields for displayed distance and duration.", hints: ["The planner displays both a distance and a travel time.", "Compare the raw measurements and localized display values in the route response.", "Make sure the selected response data supports both displayed measurements and any required warning."] };
    })() : { id: "field:museum-card", message: "The museum search response does not yet include everything shown on the destination card. Compare the card's name, address, and rating with the documented place fields.", review: "Review the relevant response fields for a place search.", hints: ["The planner displays multiple details about the selected museum.", "Match each card detail to a documented place response field.", "The selected place needs a name, readable address, rating, and an identifier to connect the route."] }
  }
};

function parameterMismatches(scenario, requests, map) {
  const mismatches = [];
  for (const request of requests) {
    const endpoint = map.get(request.endpointId);
    if (!endpoint) continue;
    const expectedSteps = scenario.acceptedPlans.flatMap((plan) => plan.steps.filter((step) => step.endpointId === request.endpointId));
    const names = new Set(expectedSteps.flatMap((step) => Object.keys(step.parameters)));
    for (const name of names) {
      if (name.toLowerCase() === "x-goog-fieldmask" || name.toLowerCase() === "fields") continue;
      const candidates = expectedSteps.filter((step) => Object.hasOwn(step.parameters, name));
      const parameter = endpoint.parameters.find((item) => item.name === name);
      const matchesSomeAcceptedVersion = candidates.some((step) => {
        const expected = step.parameters[name];
        return !findRefs(expected).length && (assessmentMatches(request.parameters?.[name], expected, step.assessment?.[name], parameter) || request.parameters?.[name] === undefined && parameter && isRuntimeParameter(parameter, expected));
      });
      if (!matchesSomeAcceptedVersion) mismatches.push({ name, endpoint });
    }
  }
  return mismatches.filter((mismatch, index, all) => all.findIndex((item) => item.name === mismatch.name && item.endpoint.id === mismatch.endpoint.id) === index);
}
function scenarioDiagnostic(scenario, key, context = {}) {
  const custom = SCENARIO_DIAGNOSTICS[scenario.id]?.[key];
  if (custom) {
    const diagnostic = key === "fieldMask" ? custom(context.endpoint, context.request) : key === "parameters" ? custom(context.parameter?.name || context.parameter?.parameter?.name || context.parameter, context.endpoint || context.parameter?.endpoint) : custom();
    if (diagnostic) return { key, ...diagnostic };
  }
  return { key, id: key, message: FORMATIVE_MESSAGES[key], review: key === "missing" ? "Compare the project's required information with the documented response fields." : "Review the relevant operation, parameter, or response-field documentation.", hints: HINTS[key] };
}

export function formativeDiagnostics(data, scenario, result, submittedRequests = []) {
  const map = endpointMap(data), requests = submittedRequests || [], issues = new Map(), maskIds = new Set();
  const add = (diagnostic) => { if (!issues.has(diagnostic.key)) issues.set(diagnostic.key, diagnostic); };
  for (let i = 0; i < requests.length; i++) {
    const request = requests[i], endpoint = map.get(request.endpointId);
    if (!endpoint) { add(scenarioDiagnostic(scenario, "operation")); continue; }
    if (fieldMaskMismatch(scenario, endpoint, request)) { add(scenarioDiagnostic(scenario, "fieldMask", { endpoint, request })); maskIds.add(endpoint.id); }
    if (dependencyMismatch(scenario, requests, i, request)) add(scenarioDiagnostic(scenario, "dependency"));
  }
  if (result.incorrectEndpoints.length || result.missing.length && requests.length) add(scenarioDiagnostic(scenario, "operation"));
  if (result.incompleteRequests.some((id) => !maskIds.has(id))) add(scenarioDiagnostic(scenario, "incomplete"));
  const mismatches = parameterMismatches(scenario, requests, map);
  if (scenario.id === "youtube-channel-hub") {
    for (const request of requests) {
      const parts = String(request.parameters?.part || "").split(",").map((value) => value.trim());
      const endpoint = map.get(request.endpointId);
      if (request.endpointId === "youtube.playlistitems-list" && !parts.includes("contentDetails")) add(scenarioDiagnostic(scenario, "parameters", { parameter: { name: "part" }, endpoint }));
      if (request.endpointId === "youtube.channels-list" && !parts.includes("contentDetails")) add(scenarioDiagnostic(scenario, "parameters", { parameter: { name: "part" }, endpoint }));
    }
  }
  if (result.invalidParameterRequests.some((id) => !maskIds.has(id))) add(scenarioDiagnostic(scenario, "parameters", mismatches.length ? { parameter: mismatches[0], endpoint: mismatches[0].endpoint } : {}));
  if (mismatches.length && !issues.has("parameters")) add(scenarioDiagnostic(scenario, "parameters", { parameter: mismatches[0], endpoint: mismatches[0].endpoint }));
  if (result.incorrectlyConfiguredRequests.some(({ endpointId }) => {
    if (maskIds.has(endpointId)) return false;
    const i = requests.findIndex((r) => r.endpointId === endpointId), endpoint = map.get(endpointId);
    return !endpoint || !dependencyMismatch(scenario, requests, i, requests[i]) && !hasAccessConflict(scenario, endpoint, requests[i]);
  })) add(scenarioDiagnostic(scenario, "parameters", mismatches.length ? { parameter: mismatches[0], endpoint: mismatches[0].endpoint } : {}));
  if (requests.some((request) => hasAccessConflict(scenario, map.get(request.endpointId), request))) add(scenarioDiagnostic(scenario, "access"));
  if (result.unnecessary.length) add(scenarioDiagnostic(scenario, "unnecessary"));
  if (!issues.size || !requests.length && result.missing.length) add(scenarioDiagnostic(scenario, "missing"));
  const order = ["operation", "dependency", "fieldMask", "incomplete", "parameters", "access", "unnecessary", "missing"];
  return order.filter((key) => issues.has(key)).slice(0, 2).map((key) => issues.get(key));
}
export function preferredPlan(scenario) { return scenario.acceptedPlans.find((p) => p.preferred) || scenario.acceptedPlans[0]; }
export function planFromAccepted(scenario, plan = preferredPlan(scenario)) { return { requests: plan.steps.map((step) => ({ endpointId: step.endpointId, parameters: Object.fromEntries(Object.entries(step.parameters).filter(([name, value]) => { const e = scenario.availableEndpointIds; return !obj(value) || !("$fromStep" in value); })), dependencies: {} })) }; }
