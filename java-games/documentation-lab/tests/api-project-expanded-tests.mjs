import fs from "node:fs";
import assert from "node:assert/strict";
import { validateApiData, validatePlan, createScenarioPicker, endpointMap, isRuntimeParameter } from "../api-project-builder-engine.js";

const data = JSON.parse(fs.readFileSync(new URL("../api-project-data-v1-expanded.json", import.meta.url)));
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
  for (const plan of scenario.acceptedPlans) {
    const result = validatePlan(data, scenario, studentPlan(scenario, plan));
    assert.equal(result.correct, true, `${scenario.id}/${plan.id}: ${result.message}`);
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
