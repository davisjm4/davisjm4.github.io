import assert from "node:assert/strict";
import fs from "node:fs";
import { validateApiData, assertValid, validatePlan, formativeDiagnostics, endpointsFor, createScenarioPicker, isRuntimeParameter, isProductionContent, endpointMap } from "../api-project-builder-engine.js";

const data = JSON.parse(fs.readFileSync(new URL("../api-project-data-v1.json", import.meta.url), "utf8"));
const uiSource = fs.readFileSync(new URL("../api-project-builder-ui.js", import.meta.url), "utf8");
assert.match(uiSource, /data-field-mask/, "the UI provides documented field selection");
assert.match(uiSource, /data-location-source/, "the UI represents runtime location sources");
assert.match(uiSource, /HTTP Methods — Quick Reference/, "the UI includes the HTTP methods reference");
assert.match(uiSource, /api-readable-request/, "solutions use readable request cards");
assert.doesNotMatch(uiSource, /data-structured-path=\"latitude\"/, "the UI does not request manual latitude entry");
assert.doesNotMatch(uiSource, /data-structured-path=\"longitude\"/, "the UI does not request manual longitude entry");
assert.equal(validateApiData(data).length, 0, validateApiData(data).join("\n"));
assert.doesNotThrow(() => assertValid(data));
assert.equal(data.providers.length, 3);
assert.equal(data.providers.reduce((n, p) => n + p.endpoints.length, 0), 24);
assert.equal(data.scenarios.length, 9);
assert.equal(data.scenarios.reduce((n, s) => n + s.acceptedPlans.length, 0), 16);
assert.equal(data.scenarios.reduce((n, s) => n + s.responseSamples.length, 0), 19);
assert.ok(isProductionContent(data));

const map = endpointMap(data);
function refs(value, found = []) { if (value && typeof value === "object" && "$fromStep" in value) found.push(value); else if (value && typeof value === "object") Object.values(value).forEach((v) => refs(v, found)); else if (Array.isArray(value)) value.forEach((v) => refs(v, found)); return found; }
function studentPlan(scenario, accepted) {
  return { requests: accepted.steps.map((step, index) => {
    const endpoint = map.get(step.endpointId), parameters = {}, dependencies = {};
    for (const [name, value] of Object.entries(step.parameters)) {
      const parameter = endpoint.parameters.find((p) => p.name === name);
      const ref = refs(value)[0];
      if (ref) {
        dependencies[name] = { fromRequest: accepted.steps.findIndex((s) => s.step === ref.$fromStep), paths: refs(value).map((r) => r.path) };
        parameters[name] = { $runtime: true };
      } else if (isRuntimeParameter(parameter, value)) {
        if (parameter.in !== "path") parameters[name] = { $runtime: true };
      } else parameters[name] = value;
    }
    return { endpointId: step.endpointId, parameters, dependencies };
  }) };
}

for (const scenario of data.scenarios) {
  assert.ok(endpointsFor(data, scenario).length >= 3, `${scenario.id}: documentation entries render`);
  for (const accepted of scenario.acceptedPlans) {
    const result = validatePlan(data, scenario, studentPlan(scenario, accepted));
    assert.equal(result.correct, true, `${scenario.id}/${accepted.id}: ${JSON.stringify(result)}`);
  }
  const bad = validatePlan(data, scenario, { requests: [] });
  assert.equal(bad.correct, false, `${scenario.id}: empty plan is incorrect`);
  assert.ok(bad.missing.length > 0, `${scenario.id}: empty plan identifies missing requests`);
}

// An ordinary resource ID is a runtime value; a meaningful time-range choice is not.
assert.equal(isRuntimeParameter({ name: "albumId", in: "path", type: "string" }), true);
assert.equal(isRuntimeParameter({ name: "time_range", in: "query", type: "string" }, "short_term"), false);

const album = data.scenarios.find((s) => s.id === "spotify-album-spotlight");
const albumEndpoint = map.get("spotify.get-album");
const missingChoice = validatePlan(data, album, { requests: [{ endpointId: albumEndpoint.id, parameters: {}, dependencies: {} }] });
assert.equal(missingChoice.correct, false);
assert.ok(["incorrect-parameters", "incomplete-requests"].includes(missingChoice.status));
assert.equal(missingChoice.unnecessary.length, 0);

const recap = data.scenarios.find((s) => s.id === "spotify-monthly-recap");
const top = recap.acceptedPlans[0].steps[0];
const wrongRange = studentPlan(recap, recap.acceptedPlans[0]);
wrongRange.requests[0].parameters.time_range = "long_term";
const wrongRangeResult = validatePlan(data, recap, wrongRange);
assert.equal(wrongRangeResult.correct, false, "behavioral parameter cannot be ignored");
const wrongRangeFeedback = formativeDiagnostics(data, recap, wrongRangeResult, wrongRange.requests);
assert.ok(wrongRangeFeedback.some((d) => d.key === "parameters"));
assert.ok(!JSON.stringify(wrongRangeFeedback).includes("short_term"), "feedback does not give the correct parameter value");
assert.equal(wrongRangeFeedback[0].hints.length, 3, "progressive hints are available");

const channel = data.scenarios.find((s) => s.id === "youtube-channel-hub");
const channelPlan = studentPlan(channel, channel.acceptedPlans[0]);
assert.equal(channelPlan.requests[1].dependencies.playlistId.fromRequest, 0);
const brokenDependency = structuredClone(channelPlan);
brokenDependency.requests[1].dependencies.playlistId.fromRequest = 1;
const brokenDependencyResult = validatePlan(data, channel, brokenDependency);
assert.equal(brokenDependencyResult.correct, false, "response dependency is graded");
const dependencyFeedback = formativeDiagnostics(data, channel, brokenDependencyResult, brokenDependency.requests);
assert.ok(dependencyFeedback.some((d) => d.key === "dependency"));
assert.ok(!JSON.stringify(dependencyFeedback).includes("playlistId"), "dependency feedback avoids exact parameter names");

const youtube = data.scenarios.find((s) => s.id === "youtube-video-compare");
const singleBatch = studentPlan(youtube, youtube.acceptedPlans[0]);
singleBatch.requests[0].parameters.part = "snippet";
const wrongPlan = validatePlan(data, youtube, singleBatch);
assert.equal(wrongPlan.correct, false);
assert.ok(wrongPlan.rejectedReason.includes("Missing parts"));
assert.equal(wrongPlan.incorrectlyConfiguredRequests[0].endpointId, "youtube.videos-list");

const albumPlan = studentPlan(album, album.acceptedPlans[0]);
const conditional = album.acceptedPlans[0].conditionalSteps[0];
albumPlan.requests.push({ endpointId: conditional.endpointId, parameters: { offset: conditional.parameters.offset, limit: conditional.parameters.limit }, dependencies: {} });
assert.equal(validatePlan(data, album, albumPlan).correct, true, "conditional pagination may be included without being required");

const museum = data.scenarios.find((s) => s.id === "maps-museum-walk-planner");
const museumPlan = studentPlan(museum, museum.acceptedPlans[0]);
museumPlan.requests[0].parameters.locationRestriction = {};
const blankOptionalObject = validatePlan(data, museum, museumPlan);
assert.equal(blankOptionalObject.correct, false);
assert.ok(blankOptionalObject.incorrectlyConfiguredRequests.some((r) => r.endpointId === "maps.places-text-search"));
assert.equal(blankOptionalObject.rejectedReason, "", "unrelated rejected-plan explanations must not be shown");

const unnecessaryRequests = [...studentPlan(youtube, youtube.acceptedPlans[0]).requests, { endpointId: "youtube.channels-list", parameters: { part: ["snippet"], forHandle: "@Campus" }, dependencies: {} }];
const unnecessaryMix = validatePlan(data, youtube, { requests: unnecessaryRequests });
assert.ok(unnecessaryMix.unnecessary.length > 0 || unnecessaryMix.incompleteRequests.length > 0);
assert.equal(unnecessaryMix.incorrectEndpoints.length, 0, "documented distractors are not misclassified as unavailable endpoints");
const unnecessaryFeedback = formativeDiagnostics(data, youtube, unnecessaryMix, unnecessaryRequests);
assert.ok(unnecessaryFeedback.some((d) => d.key === "unnecessary"));
assert.ok(!JSON.stringify(unnecessaryFeedback).includes("youtube.channels-list"));

const emptyFeedback = formativeDiagnostics(data, album, validatePlan(data, album, { requests: [] }), []);
assert.ok(emptyFeedback.some((d) => d.key === "missing"));
assert.ok(!JSON.stringify(emptyFeedback).includes("spotify.get-album"), "missing information feedback does not name an endpoint");

const authScenario = data.scenarios.find((s) => s.id === "spotify-album-spotlight");
const authPlan = { requests: [{ endpointId: "spotify.get-current-user-playlists", parameters: {}, dependencies: {} }] };
assert.ok(formativeDiagnostics(data, authScenario, validatePlan(data, authScenario, authPlan), authPlan.requests).some((d) => d.key === "access"));
const legacyPlan = { requests: [{ endpointId: "maps.directions-legacy", parameters: { origin: "hotel", destination: "museum" }, dependencies: {} }] };
assert.ok(formativeDiagnostics(data, museum, validatePlan(data, museum, legacyPlan), legacyPlan.requests).some((d) => d.key === "access"));

const museumMaskPlan = studentPlan(museum, museum.acceptedPlans[0]);
museumMaskPlan.requests[0].parameters["X-Goog-FieldMask"] = "places.id";
const maskFeedback = formativeDiagnostics(data, museum, validatePlan(data, museum, museumMaskPlan), museumMaskPlan.requests);
assert.ok(maskFeedback.some((d) => d.key === "fieldMask"));
assert.ok(!JSON.stringify(maskFeedback).includes("places.displayName"), "field-mask feedback avoids exact fields to add");

const invalid = structuredClone(data);
invalid.scenarios[0].availableEndpointIds[0] = "missing.endpoint";
assert.ok(validateApiData(invalid).some((error) => error.includes("unknown endpoint")));
const incomplete = structuredClone(data);
delete incomplete.scenarios[0].acceptedPlans[0].steps[0].parameters.id;
assert.ok(validateApiData(incomplete).some((error) => error.includes("missing required")));

const picker = createScenarioPicker(data, () => 0.43);
let last = null;
for (let i = 0; i < data.scenarios.length * 2; i++) {
  const next = picker("all");
  assert.notEqual(next.id, last, "scenario rotation avoids immediate repeats");
  last = next.id;
}
const spotifyPick = picker("spotify");
assert.equal(spotifyPick.providerId, "spotify");

console.log("API Project Builder: schema, all 9 scenarios/16 accepted plans, runtime IDs, parameter grading, dependencies, rejected-plan feedback, and rotation passed.");
