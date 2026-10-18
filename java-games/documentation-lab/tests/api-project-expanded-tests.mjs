import fs from "node:fs";
import assert from "node:assert/strict";
import { validateApiData, validatePlan, createScenarioPicker, endpointMap, isRuntimeParameter } from "../api-project-builder-engine.js";
import { presentation, classification, automaticParametersForOccurrence } from "../api-project-presentation.js";
import { presentationFor, fieldMaskChoices, focusedFields, dependencySlotOptions, multiSourceDependencyControl } from "../api-project-builder-ui.js";

// Exercise the same provider shards used by the deployed loader. The merged
// convenience export can exceed repository-content API response limits.
const index = JSON.parse(fs.readFileSync(new URL("../api-project-data-v1-runtime-index.json", import.meta.url)));
const parts = index.runtimeParts.map((path) => JSON.parse(fs.readFileSync(new URL(`../${path.replace(/^\.\//, "")}`, import.meta.url))));
const data = { schemaVersion: parts[0].schemaVersion, providers: parts.flatMap((part) => part.providers), scenarios: parts.flatMap((part) => part.scenarios) };
const uiSource = fs.readFileSync(new URL("../api-project-builder-ui.js", import.meta.url), "utf8");
assert.match(uiSource, /runtimeDescriptionsFor/, "runtime input metadata drives symbolic student-facing descriptions");
assert.match(uiSource, /p\.type === "object" && \(p\.name === "locationRestriction" \|\| p\.name === "locationBias"\)/, "a supplied location center does not hide the assessed search radius control");
const errors = validateApiData(data);
assert.deepEqual(errors, [], errors.join("\n"));

const enabled = data.scenarios.filter((s) => s.stage1Compatible === true && !(s.engineSupportRequired || []).length);
assert.equal(enabled.length, 36);
assert.equal(data.scenarios.length, 53);
assert.equal(data.providers.length, 6);
assert.deepEqual(Object.fromEntries(data.providers.map((provider) => [provider.id, enabled.filter((scenario) => scenario.providerId === provider.id).length])), { spotify: 6, youtube: 6, "google-maps": 7, discord: 6, tiktok: 4, openai: 7 });

const map = endpointMap(data);
const lunch = data.scenarios.find((scenario) => scenario.id === "maps-lunch-spot-finder");
const lunchNearby = map.get("maps.places-nearby-search");
assert.equal(presentationFor(lunchNearby, lunchNearby.parameters.find((parameter) => parameter.name === "locationRestriction")), "location");
assert.ok(classification(lunch, lunchNearby).assessed.includes("locationRestriction"), "the search radius remains a meaningful assessed decision while GPS is app-supplied");
function findReferences(value, found = []) {
  if (value && typeof value === "object" && value.$fromStep) found.push(value);
  else if (value && typeof value === "object") Object.values(value).forEach((child) => findReferences(child, found));
  else if (Array.isArray(value)) value.forEach((child) => findReferences(child, found));
  return found;
}
function findReferenceBindings(value, targetPath = [], found = []) {
  if (value && typeof value === "object" && "$fromStep" in value) found.push({ targetPath: targetPath.join("."), fromStep: value.$fromStep, path: value.path });
  else if (value && typeof value === "object") Object.entries(value).forEach(([key, child]) => findReferenceBindings(child, [...targetPath, key], found));
  else if (Array.isArray(value)) value.forEach((child, index) => findReferenceBindings(child, [...targetPath, String(index)], found));
  return found;
}
function hasRuntimeOrReference(value) {
  if (!value || typeof value !== "object") return false;
  if ("$runtime" in value || "$fromStep" in value) return true;
  return Array.isArray(value) ? value.some(hasRuntimeOrReference) : Object.values(value).some(hasRuntimeOrReference);
}
function documentedField(endpoint, field) {
  const normalizedField = field.replaceAll("[]", "").replace(/^\./, "");
  return endpoint.responseFields.some((item) => {
    const path = item.path.replaceAll("[]", "").replace(/^\./, "");
    return path === normalizedField || path.startsWith(`${normalizedField}.`) || normalizedField.startsWith(`${path}.`) || path.endsWith(`.${normalizedField}`);
  });
}
function studentPlan(scenario, plan) {
  const requests = [];
  for (const step of plan.steps) {
    const endpoint = map.get(step.endpointId);
    const parameters = {};
    const dependencies = {};
    for (const [name, value] of Object.entries(step.parameters)) {
      const parameter = endpoint.parameters.find((p) => p.name === name);
      const references = findReferences(value);
      if (references.length) {
        const bindings = findReferenceBindings(value).map((reference) => ({ targetPath: reference.targetPath, path: reference.path, fromRequest: plan.steps.findIndex((candidate) => candidate.step === reference.fromStep) }));
        parameters[name] = { $runtime: true };
        if (new Set(bindings.map((binding) => binding.fromRequest)).size > 1) dependencies[name] = { bindings };
        else dependencies[name] = { fromRequest: bindings[0].fromRequest, paths: bindings.map((binding) => binding.path) };
      } else if (value && typeof value === "object" && value.$runtime) {
        parameters[name] = { $runtime: true };
      } else if (isRuntimeParameter(parameter, value)) {
        if (parameter.in !== "path") parameters[name] = { $runtime: true };
      } else if (!(parameter?.in === "path" && !parameter.allowedValues?.length)) {
        parameters[name] = value;
      }
    }
    requests.push({ endpointId: step.endpointId, parameters, dependencies });
  }
  return { requests };
}

for (const scenario of enabled) {
  assert.ok(scenario.availableEndpointIds.every((id) => map.has(id)), `${scenario.id}: endpoint reference`);
  assert.ok(scenario.acceptedPlans.length > 0, `${scenario.id}: accepted plan`);
  for (const endpointId of scenario.availableEndpointIds) {
    const endpoint = map.get(endpointId), config = presentation(scenario, endpoint);
    for (const field of config.fields || []) assert.ok(documentedField(endpoint, field), `${scenario.id}/${endpointId}: displayed response field ${field} is documented`);
    for (const field of config.fieldOptions || []) assert.ok(documentedField(endpoint, field), `${scenario.id}/${endpointId}: field selector option ${field} is documented`);
    for (const name of classification(scenario, endpoint).assessed) {
      const parameter = endpoint.parameters.find((item) => item.name === name);
      if (presentationFor(endpoint, parameter) === "text") {
        const values = scenario.acceptedPlans.flatMap((plan) => plan.steps.filter((step) => step.endpointId === endpointId).map((step) => step.parameters[name]));
        const specialized = !!config.choiceOptions?.[name] || name === "market" && !!config.marketOptions || values.some(hasRuntimeOrReference);
        assert.ok(specialized, `${scenario.id}/${endpointId}.${name}: arbitrary text is not a supported student control`);
      }
    }
  }
  for (const plan of scenario.acceptedPlans) {
    for (const step of plan.steps) {
      const endpoint = map.get(step.endpointId);
      for (const [name, value] of Object.entries(step.parameters)) if (name === "X-Goog-FieldMask" || name.toLowerCase() === "fields") {
        const controls = (presentation(scenario, endpoint).fieldOptions || fieldMaskChoices(endpoint).map((choice) => choice.path));
        for (const field of String(value).split(",").map((item) => item.trim()).filter(Boolean)) assert.ok(controls.includes(field), `${scenario.id}/${endpoint.id}: field selector can represent ${field}`);
      }
    }
    const result = validatePlan(data, scenario, studentPlan(scenario, plan));
    assert.equal(result.correct, true, `${scenario.id}/${plan.id}: ${result.message}`);
    const occurrences = new Map();
    const focused = { requests: plan.steps.map((step) => {
      const endpoint = map.get(step.endpointId), groups = classification(scenario, endpoint), occurrence = occurrences.get(step.endpointId) || 0;
      occurrences.set(step.endpointId, occurrence + 1);
      const parameters = automaticParametersForOccurrence(scenario, endpoint, occurrence), dependencies = {};
      for (const name of groups.assessed) {
        const value = step.parameters[name];
        if (value === undefined) continue;
        const references = findReferences(value);
        if (references.length) {
          parameters[name] = { $runtime: true };
          dependencies[name] = { fromRequest: plan.steps.findIndex((candidate) => candidate.step === references[0].$fromStep), paths: references.map((reference) => reference.path) };
        } else if (isRuntimeParameter(endpoint.parameters.find((parameter) => parameter.name === name), value)) parameters[name] = { $runtime: true };
        else parameters[name] = value;
      }
      return { endpointId: step.endpointId, parameters, dependencies };
    }) };
    const focusedResult = validatePlan(data, scenario, focused);
    assert.equal(focusedResult.correct, true, `${scenario.id}/${plan.id}: focused controls can construct the accepted plan: ${JSON.stringify(focusedResult)}`);
  }
  const nearMiss = studentPlan(scenario, scenario.acceptedPlans[0]);
  let corrupted = false;
  for (let requestIndex = 0; requestIndex < scenario.acceptedPlans[0].steps.length && !corrupted; requestIndex++) {
    const step = scenario.acceptedPlans[0].steps[requestIndex], endpoint = map.get(step.endpointId), request = nearMiss.requests[requestIndex];
    for (const name of classification(scenario, endpoint).assessed) {
      const value = step.parameters[name], assessment = step.assessment?.[name], references = findReferences(value);
      if (references.length) {
        if (request.dependencies[name]?.bindings) request.dependencies[name] = { bindings: [] };
        else request.dependencies[name] = { fromRequest: -1, paths: ["not.a.documented.response.field"] };
        corrupted = true;
        break;
      }
      if (assessment?.mode === "notAssessed" || assessment?.mode === "structural" || isRuntimeParameter(endpoint.parameters.find((parameter) => parameter.name === name), value)) continue;
      if (assessment?.mode === "includesAll") request.parameters[name] = "not.a.documented.field";
      else if (assessment?.mode === "oneOf") request.parameters[name] = "not-an-accepted-choice";
      else if (typeof value === "string") request.parameters[name] = "not-the-required-choice";
      else if (typeof value === "number") request.parameters[name] = value + 1;
      else if (typeof value === "boolean") request.parameters[name] = !value;
      else request.parameters[name] = "not-the-required-choice";
      corrupted = true;
      break;
    }
  }
  if (corrupted) assert.equal(validatePlan(data, scenario, nearMiss).correct, false, `${scenario.id}: a near-miss plan remains incorrect`);
  const incorrect = { requests: [] };
  assert.equal(validatePlan(data, scenario, incorrect).correct, false, `${scenario.id}: incorrect plan rejected`);
}

// The selectable response-field options come from the same function used by
// endpoint documentation and dependency controls. Check every published answer
// key (including alternatives), not just the provider's baseline scenarios.
let constructiblePlans = 0;
for (const scenario of enabled) for (const plan of scenario.acceptedPlans) {
  for (const step of plan.steps) for (const value of Object.values(step.parameters)) for (const reference of findReferences(value)) {
    const sourceStep = plan.steps.find((candidate) => candidate.step === reference.$fromStep), sourceEndpoint = map.get(sourceStep.endpointId);
    const options = focusedFields(sourceEndpoint, scenario).map((field) => field.path);
    assert.ok(options.includes(reference.path), `${scenario.id}/${plan.id}: selectable response fields include ${reference.path} from ${sourceEndpoint.id}`);
  }
  const represented = studentPlan(scenario, plan);
  assert.equal(validatePlan(data, scenario, represented).correct, true, `${scenario.id}/${plan.id}: options-generated student plan passes the evaluator`);
  constructiblePlans++;
}
assert.equal(constructiblePlans, enabled.reduce((sum, scenario) => sum + scenario.acceptedPlans.length, 0));
const repairCases = [
  "spotify-session-rewind-saver", "youtube-study-mix-copier", "youtube-book-review-leaderboard",
  "discord-my-servers-dashboard", "discord-event-volunteer-desk", "tiktok-club-recap-publisher",
];
const rewind = data.scenarios.find((scenario) => scenario.id === "spotify-session-rewind-saver");
assert.equal(dependencySlotOptions(rewind, "spotify.add-items-to-playlist", "playlist_id").length, 1, "alternative plan order does not look like a multi-source parameter");
assert.equal(dependencySlotOptions(rewind, "spotify.add-items-to-playlist", "uris").length, 1, "one-source response arrays keep the shared dependency control");
for (const scenarioId of repairCases) {
  const scenario = data.scenarios.find((item) => item.id === scenarioId);
  assert.ok(scenario, `${scenarioId}: repair target exists in verified content`);
  for (const plan of scenario.acceptedPlans) {
    const represented = studentPlan(scenario, plan);
    assert.equal(validatePlan(data, scenario, represented).correct, true, `${scenarioId}/${plan.id}: repair target plan can be represented and submitted`);
    let incorrect = structuredClone(represented), changed = false;
    for (let requestIndex = 0; requestIndex < plan.steps.length && !changed; requestIndex++) {
      const step = plan.steps[requestIndex], request = incorrect.requests[requestIndex];
      for (const [name, value] of Object.entries(step.parameters)) for (const reference of findReferences(value)) {
        const sourceStep = plan.steps.find((candidate) => candidate.step === reference.$fromStep), source = map.get(sourceStep.endpointId);
        const alternatives = focusedFields(source, scenario).map((field) => field.path).filter((path) => path !== reference.path);
        assert.ok(focusedFields(source, scenario).some((field) => field.path === reference.path), `${scenarioId}: required field appears in student choices`);
        assert.ok(alternatives.length, `${scenarioId}: at least one plausible documented distractor is offered for ${reference.path}`);
        if (request.dependencies[name]?.bindings) {
          const targetPath = findReferenceBindings(value).find((binding) => binding.path === reference.path).targetPath;
          const binding = request.dependencies[name].bindings.find((item) => item.targetPath === targetPath);
          const sourceRequest = plan.steps.findIndex((candidate) => candidate.step === reference.$fromStep);
          const slot = dependencySlotOptions(scenario, step.endpointId, name).find((item) => item.targetPath === targetPath);
          assert.ok(slot.sourceEndpointIds.includes(plan.steps[sourceRequest].endpointId), `${scenarioId}: ${targetPath} offers its earlier source request`);
          assert.ok(slot.responsePaths.includes(reference.path), `${scenarioId}: ${targetPath} offers its required response path`);
          binding.path = alternatives[0];
        } else request.dependencies[name].paths = [alternatives[0]];
        changed = true;
        break;
      }
    }
    if (changed) assert.equal(validatePlan(data, scenario, incorrect).correct, false, `${scenarioId}/${plan.id}: incorrect response source remains rejected`);
  }
}
const studyMix = data.scenarios.find((scenario) => scenario.id === "youtube-study-mix-copier"), insert = map.get("youtube.playlistitems-insert");
const mixSlots = dependencySlotOptions(studyMix, insert.id, "snippet");
assert.equal(mixSlots.length, 2, "Study Mix Copier presents one source slot per related value");
assert.deepEqual(mixSlots.map((slot) => slot.targetPath).sort(), ["playlistId", "resourceId.videoId"]);
assert.notDeepEqual(mixSlots[0].sourceEndpointIds, mixSlots[1].sourceEndpointIds, "Study Mix Copier's values can come from separate earlier requests");
const mixPlan = studyMix.acceptedPlans[0], sourceRequests = mixPlan.steps.slice(0, 2).map((step) => ({ endpointId: step.endpointId, parameters: {}, dependencies: {} })), insertStep = mixPlan.steps.find((step) => step.endpointId === insert.id);
const preselectedBindings = findReferenceBindings(insertStep.parameters.snippet).map((binding) => ({ ...binding, fromRequest: mixPlan.steps.findIndex((step) => step.step === binding.fromStep) }));
const mixControlHtml = multiSourceDependencyControl({ name: "snippet", description: "Playlist item details", required: true }, { endpointId: insert.id, parameters: {}, dependencies: { snippet: { bindings: preselectedBindings } } }, 2, sourceRequests, studyMix, map);
for (const targetPath of ["playlistId", "resourceId.videoId"]) assert.ok(mixControlHtml.includes(`data-target-path="${targetPath}"`), `Study Mix Copier renders a separate source control for ${targetPath}`);
for (const requiredPath of ["id", "items[].contentDetails.videoId"]) assert.ok(mixControlHtml.includes(`value="${requiredPath}"`), `Study Mix Copier renders the required source field ${requiredPath}`);
const noPlan = data.scenarios.filter((scenario) => scenario.expectedOutcome === "no-valid-plan");
assert.equal(noPlan.length, 6);
for (const scenario of noPlan) assert.equal(scenario.acceptedPlans.length, 0, `${scenario.id}: intentionally has no accepted request plan`);

const picker = createScenarioPicker(data, () => 0.37);
const seen = new Set();
for (let i = 0; i < enabled.length * 2; i++) {
  const scenario = picker("all");
  assert.ok(scenario && scenario.stage1Compatible === true, "picker only exposes Stage 1 scenarios");
  assert.equal(seen.has(`${i}:${scenario.id}`), false);
  seen.add(`${i}:${scenario.id}`);
}
for (const providerId of ["spotify", "youtube", "google-maps", "discord", "tiktok", "openai"]) {
  const scenario = picker(providerId);
  assert.equal(scenario.providerId, providerId);
}

console.log(`Expanded API Project Builder: ${enabled.length} published scenarios; ${constructiblePlans} accepted plans represented through generated controls and accepted; ${noPlan.length} no-valid-plan scenarios checked separately; invalid-plan rejection, six-provider filtering, and rotation passed.`);
