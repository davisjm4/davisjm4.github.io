import fs from "node:fs";
import assert from "node:assert/strict";
import { validateApiData, validatePlan, createScenarioPicker, endpointMap, isRuntimeParameter } from "../api-project-builder-engine.js";
import { presentation, classification, automaticParametersForOccurrence } from "../api-project-presentation.js";
import { presentationFor } from "../api-project-builder-ui.js";

// Exercise the same provider shards used by the deployed loader. The merged
// convenience export can exceed repository-content API response limits.
const index = JSON.parse(fs.readFileSync(new URL("../api-project-data-v1-runtime-index.json", import.meta.url)));
const parts = index.runtimeParts.map((path) => JSON.parse(fs.readFileSync(new URL(`../${path.replace(/^\.\//, "")}`, import.meta.url))));
const data = { schemaVersion: parts[0].schemaVersion, providers: parts.flatMap((part) => part.providers), scenarios: parts.flatMap((part) => part.scenarios) };
const errors = validateApiData(data);
assert.deepEqual(errors, [], errors.join("\n"));

const enabled = data.scenarios.filter((s) => s.stage1Compatible === true && !(s.engineSupportRequired || []).length);
assert.equal(enabled.length, 36);
assert.equal(data.scenarios.length, 53);
assert.equal(data.providers.length, 6);

const map = endpointMap(data);
function findReferences(value, found = []) {
  if (value && typeof value === "object" && value.$fromStep) found.push(value);
  else if (value && typeof value === "object") Object.values(value).forEach((child) => findReferences(child, found));
  else if (Array.isArray(value)) value.forEach((child) => findReferences(child, found));
  return found;
}
function hasRuntimeOrReference(value) {
  if (!value || typeof value !== "object") return false;
  if ("$runtime" in value || "$fromStep" in value) return true;
  return Array.isArray(value) ? value.some(hasRuntimeOrReference) : Object.values(value).some(hasRuntimeOrReference);
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
        const fromRequest = plan.steps.findIndex((candidate) => candidate.step === references[0].$fromStep);
        parameters[name] = { $runtime: true };
        dependencies[name] = { fromRequest, paths: references.map((reference) => reference.path) };
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
  const incorrect = { requests: [] };
  assert.equal(validatePlan(data, scenario, incorrect).correct, false, `${scenario.id}: incorrect plan rejected`);
}

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

console.log(`Expanded API Project Builder: ${enabled.length} Stage 1 scenarios, all accepted plans, invalid-plan rejection, six-provider filtering, and rotation passed.`);
