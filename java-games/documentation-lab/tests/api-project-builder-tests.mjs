import assert from "node:assert/strict";
import fs from "node:fs";
import { validateApiData, assertValid, validatePlan, formativeDiagnostics, endpointsFor, createScenarioPicker, isRuntimeParameter, isProductionContent, endpointMap } from "../api-project-builder-engine.js";
import { presentationFor, fieldMaskChoices, serializeMultiSelection, responseSourceChoices, responseSourceControl, focusedFields } from "../api-project-builder-ui.js";
import { presentation, classification, automaticParameters, PROJECT_PRESENTATION, RESPONSE_SOURCE_CHOICES } from "../api-project-presentation.js";

const data = JSON.parse(fs.readFileSync(new URL("../api-project-data-v1.json", import.meta.url), "utf8"));
const uiSource = fs.readFileSync(new URL("../api-project-builder-ui.js", import.meta.url), "utf8");
assert.match(uiSource, /data-field-mask/, "the UI provides documented field selection");
assert.match(uiSource, /data-location-radius/, "the UI assesses radius while the application supplies GPS coordinates");
assert.match(uiSource, /HTTP Methods — Quick Reference/, "the UI includes the HTTP methods reference");
assert.match(uiSource, /api-readable-request/, "solutions use readable request cards");
assert.doesNotMatch(uiSource, /data-structured-path=\"latitude\"/, "the UI does not request manual latitude entry");
assert.doesNotMatch(uiSource, /data-structured-path=\"longitude\"/, "the UI does not request manual longitude entry");
assert.doesNotMatch(uiSource, /Required; separate values with commas/, "the UI does not ask students to type comma-separated values");
assert.doesNotMatch(uiSource, /placeholder=\"<small class=/, "HTML-like placeholder text cannot leak into controls");
assert.equal(validateApiData(data).length, 0, validateApiData(data).join("\n"));
assert.doesNotThrow(() => assertValid(data));
assert.equal(data.providers.length, 3);
assert.equal(data.providers.reduce((n, p) => n + p.endpoints.length, 0), 24);
assert.equal(data.scenarios.length, 9);
assert.equal(data.scenarios.reduce((n, s) => n + s.acceptedPlans.length, 0), 16);
assert.equal(data.scenarios.reduce((n, s) => n + s.responseSamples.length, 0), 19);
assert.ok(isProductionContent(data));

const map = endpointMap(data);
const parameterInventory = [];
for (const provider of data.providers) for (const endpoint of provider.endpoints) for (const parameter of endpoint.parameters) {
  const kind = presentationFor(endpoint, parameter);
  parameterInventory.push({ provider: provider.id, endpoint: endpoint.id, parameter: parameter.name, kind, required: !!parameter.required });
  if (parameter.allowedValues?.length && (parameter.format === "comma-separated" || parameter.type === "array<string>")) assert.equal(kind, "multi", `${endpoint.id}.${parameter.name} uses a multiselect`);
  if (parameter.name === "X-Goog-FieldMask" || parameter.name.toLowerCase() === "fields") assert.equal(kind, "field-mask", `${endpoint.id}.${parameter.name} uses documented field selection`);
  if (parameter.in === "path" && isRuntimeParameter(parameter)) assert.equal(kind, "runtime", `${endpoint.id}.${parameter.name} is symbolic`);
  if (["integer", "number"].includes(parameter.type) && (parameter.minimum != null || parameter.maximum != null)) assert.equal(kind, "numeric", `${endpoint.id}.${parameter.name} is bounded`);
}
assert.ok(parameterInventory.some((p) => p.endpoint === "youtube.channels-list" && p.parameter === "part" && p.kind === "multi"));
assert.ok(parameterInventory.some((p) => p.endpoint === "maps.places-nearby-search" && p.parameter === "locationRestriction" && p.kind === "location"));
assert.equal(serializeMultiSelection({ type: "string", allowedValues: ["snippet", "statistics", "contentDetails"] }, ["statistics", "snippet", "snippet"]), "snippet,statistics");
assert.deepEqual(serializeMultiSelection({ type: "array<string>", allowedValues: ["restaurant", "cafe"] }, ["cafe", "restaurant", "cafe"]), ["restaurant", "cafe"]);
const routesMask = fieldMaskChoices(map.get("maps.routes-compute-routes"));
assert.ok(routesMask.some((f) => f.path === "routes.distanceMeters"), "route field masks use documented response fields");
assert.ok(!JSON.stringify(parameterInventory).includes("latitude"), "coordinates are not classified as student-entered parameters");
function refs(value, found = []) { if (value && typeof value === "object" && "$fromStep" in value) found.push(value); else if (value && typeof value === "object") Object.values(value).forEach((v) => refs(v, found)); else if (Array.isArray(value)) value.forEach((v) => refs(v, found)); return found; }
function studentPlan(scenario, accepted, content = data, endpointLookup = map) {
  return { requests: accepted.steps.map((step, index) => {
    const endpoint = endpointLookup.get(step.endpointId), parameters = {}, dependencies = {};
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

const expandedData = JSON.parse(fs.readFileSync(new URL("../api-project-data-v1-expanded.json", import.meta.url), "utf8"));
const expandedMap = endpointMap(expandedData);
const publishedScenarios = expandedData.scenarios.filter((scenario) => scenario.stage1Compatible === true && !(scenario.engineSupportRequired || []).length);
assert.equal(publishedScenarios.length, 36, "the expanded library exposes exactly the 36 Stage 1 scenarios");
const targetCases = [
  ["spotify-session-rewind-saver", "spotify.get-recently-played", "uris", "items[].track.uri"],
  ["youtube-study-mix-copier", "youtube.playlistitems-list", "snippet", "items[].contentDetails.videoId"],
  ["youtube-book-review-leaderboard", "youtube.search-list", "id", "items[].id.videoId"],
  ["discord-my-servers-dashboard", "discord.get-current-user-guilds", "guild_id", "[].id"],
  ["discord-event-volunteer-desk", "discord.search-guild-members", "user_id", "[].user.id"],
  ["tiktok-club-recap-publisher", "tiktok.direct-post-video-init", "publish_id", "data.publish_id"],
  ["openai-reading-packet-qa", "openai.upload-file", "input", "id"],
  ["openai-textbook-photo-flashcards", "openai.upload-file", "input", "id"],
];
for (const [scenarioId, sourceId, parameter, path] of targetCases) {
  const scenario = expandedData.scenarios.find((item) => item.id === scenarioId);
  const endpoint = expandedMap.get(sourceId);
  assert.ok(scenario && endpoint, `${scenarioId}: scenario and source endpoint exist`);
  const choices = responseSourceChoices(scenario, endpoint, parameter);
  assert.ok(choices.some((choice) => choice.canonicalPath === path), `${scenarioId}: ${path} can be selected`);
  assert.ok(choices.length >= 2 && choices.length <= 4, `${scenarioId}: focused set has two to four options`);
  assert.ok(choices.every((choice) => endpoint.responseFields.some((field) => field.path === choice.canonicalPath)), `${scenarioId}: every choice is a canonical documented path`);
  assert.ok(choices.every((choice) => choice.label && choice.label !== choice.canonicalPath), `${scenarioId}: choices have a plain-language description`);
  if (scenario.stage1Compatible && !(scenario.engineSupportRequired || []).length) {
    const markup = responseSourceControl(scenario, endpoint, parameter, { paths: [path] }, 2);
    assert.match(markup, /type="radio"/, `${scenarioId}: single-source field choice uses radios`);
    assert.match(markup, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${scenarioId}: the canonical path remains the input value`);
  }
}

let checkedAcceptedPlans = 0, checkedIncorrectAlternatives = 0, checkedSourceDecisions = 0;
for (const scenario of publishedScenarios) for (const accepted of scenario.acceptedPlans) {
  const represented = studentPlan(scenario, accepted, expandedData, expandedMap);
  for (const step of accepted.steps) for (const [name, value] of Object.entries(step.parameters)) {
    for (const ref of refs(value)) {
      const sourceStep = accepted.steps.find((candidate) => candidate.step === ref.$fromStep);
      const source = expandedMap.get(sourceStep.endpointId);
      const choices = responseSourceChoices(scenario, source, name);
      assert.ok(choices.some((choice) => choice.canonicalPath === ref.path), `${scenario.id}/${accepted.id}: ${ref.path} is selectable for ${name}`);
      assert.ok(classification(scenario, expandedMap.get(step.endpointId)).assessed.includes(name), `${scenario.id}/${accepted.id}: ${name} renders as a response-source control`);
      assert.ok(focusedFields(source, scenario).some((field) => field.path === ref.path), `${scenario.id}/${accepted.id}: the authentic path appears in focused documentation`);
      const sourceMarkup = responseSourceControl(scenario, source, name, { paths: [ref.path] }, accepted.steps.findIndex((candidate) => candidate.endpointId === step.endpointId));
      assert.match(sourceMarkup, /type="(?:radio|checkbox)"/, `${scenario.id}/${accepted.id}: a selectable field control is generated`);
      checkedSourceDecisions++;
    }
  }
  const result = validatePlan(expandedData, scenario, represented);
    assert.equal(result.correct, true, `${scenario.id}/${accepted.id}: accepted-plan source references pass through the evaluator: ${JSON.stringify(result)}`);
  checkedAcceptedPlans++;
  let incorrect = false;
  for (const request of represented.requests) {
    for (const [name, dep] of Object.entries(request.dependencies || {})) {
      const source = expandedMap.get(represented.requests[dep.fromRequest]?.endpointId);
      const expected = new Set(scenario.acceptedPlans.flatMap((plan) => plan.steps.flatMap((step) => refs(step.parameters?.[name]).map((ref) => ref.path))));
      const alternate = responseSourceChoices(scenario, source, name).find((choice) => !expected.has(choice.canonicalPath));
      if (!alternate || !dep.paths?.length) continue;
      const bad = structuredClone(represented);
      const badDependency = bad.requests[request === represented.requests[0] ? 0 : represented.requests.indexOf(request)].dependencies[name];
      badDependency.paths = [alternate.canonicalPath];
      assert.equal(validatePlan(expandedData, scenario, bad).correct, false, `${scenario.id}/${accepted.id}: plausible wrong path is rejected`);
      checkedIncorrectAlternatives++; incorrect = true; break;
    }
    if (incorrect) break;
  }
}
assert.equal(checkedAcceptedPlans, publishedScenarios.reduce((sum, scenario) => sum + scenario.acceptedPlans.length, 0));
assert.ok(checkedIncorrectAlternatives > 0, "plausible incorrect response paths are still rejected");
for (const [scenarioId, , ,] of targetCases) {
  const scenario = expandedData.scenarios.find((item) => item.id === scenarioId);
  if (scenario.stage1Compatible && !(scenario.engineSupportRequired || []).length) continue;
  assert.equal(scenario.stage1Compatible, false, `${scenarioId} is intentionally unavailable in student practice`);
  assert.ok((scenario.engineSupportRequired || []).length > 0, `${scenarioId} remains deferred for its unsupported format`);
}
console.log(`Response-source coverage: ${publishedScenarios.length} enabled scenarios, ${checkedAcceptedPlans} accepted-plan variants checked by the evaluator, ${checkedSourceDecisions} required source selections exposed by the controls; ${checkedIncorrectAlternatives} plausible incorrect fields rejected. This verifies response-source choices, not full-plan control coverage. The ${targetCases.filter(([id]) => !publishedScenarios.some((scenario) => scenario.id === id)).length} deferred audit scenarios remain disabled.`);

// The focused-control checks below cover the original nine scenarios only.
const focusedInventory = [];
for (const scenario of data.scenarios) {
  for (const endpoint of endpointsFor(data, scenario)) {
    const config = presentation(scenario, endpoint);
    for (const path of config.fields || []) assert.ok(endpoint.responseFields.some((f) => f.path === path), `${scenario.id}/${endpoint.id}: focused field ${path} is documented`);
  }
  const preferred = scenario.acceptedPlans[0], controls = [];
  for (const step of preferred.steps) {
    const endpoint = map.get(step.endpointId), config = presentation(scenario, endpoint), groups = classification(scenario, endpoint);
    assert.equal(new Set([...groups.assessed, ...groups.automatic, ...groups.hidden]).size, endpoint.parameters.length, `${scenario.id}/${endpoint.id}: partition all parameters`);
    for (const name of groups.assessed) assert.ok(endpoint.parameters.some((p) => p.name === name), `${scenario.id}/${endpoint.id}: assessed name exists`);
    for (const name of groups.automatic) assert.ok(endpoint.parameters.some((p) => p.name === name), `${scenario.id}/${endpoint.id}: automatic name exists`);
    for (const option of config.partOptions || []) assert.ok(endpoint.parameters.find((p) => p.name === "part")?.allowedValues.includes(option), `${scenario.id}: authentic part option ${option}`);
    for (const path of config.fields || []) assert.ok(endpoint.responseFields.some((f) => f.path === path), `${scenario.id}/${endpoint.id}: response field ${path} documented`);
    for (const path of config.fieldOptions || []) assert.ok(endpoint.responseFields.some((f) => f.path.replaceAll("[]", "") === path || f.path.replaceAll("[]", "").startsWith(`${path}.`)), `${scenario.id}/${endpoint.id}: field mask ${path} documented`);
    const auto = automaticParameters(scenario, endpoint);
    for (const name of groups.assessed) assert.ok(!Object.hasOwn(auto, name) || name === "locationRestriction", `${scenario.id}: ${name} must not be preanswered`);
    controls.push(...groups.assessed.map((name) => `${endpoint.id}.${name}`));
  }
  assert.ok(controls.length <= 6, `${scenario.id}: more than six decisions`);
  focusedInventory.push({ scenarioId: scenario.id, before: preferred.steps.reduce((sum, step) => sum + map.get(step.endpointId).parameters.length, 0), after: controls.length, controls });
  for (const accepted of scenario.acceptedPlans) {
    const requests = accepted.steps.map((step) => {
      const endpoint = map.get(step.endpointId), groups = classification(scenario, endpoint), parameters = automaticParameters(scenario, endpoint), dependencies = {};
      for (const name of groups.assessed) {
        const value = step.parameters[name]; if (value === undefined) continue;
        const found = refs(value);
        if (found.length) {
          parameters[name] = { $runtime: true };
          dependencies[name] = { source: "request", fromRequest: accepted.steps.findIndex((s) => s.step === found[0].$fromStep), paths: found.map((r) => r.path) };
        } else parameters[name] = value;
      }
      // The hidden redirect toggle is optional; the simpler verified plan omits it.
      return { endpointId: step.endpointId, parameters, dependencies };
    });
    const reachable = validatePlan(data, scenario, { requests });
    if (scenario.id === "maps-saved-place-card" && accepted === scenario.acceptedPlans[0]) continue;
    assert.equal(reachable.correct, true, `${scenario.id}/${accepted.id}: focused UI can reach accepted plan: ${JSON.stringify(reachable)}`);
  }
}
assert.equal(focusedInventory.length, 9);
assert.deepEqual(classification(data.scenarios.find((s) => s.id === "youtube-study-video-finder"), map.get("youtube.search-list")).assessed, ["type", "videoDuration", "maxResults"]);
assert.equal(automaticParameters(data.scenarios.find((s) => s.id === "youtube-study-video-finder"), map.get("youtube.search-list")).q.$runtime, true);
assert.equal(automaticParameters(data.scenarios.find((s) => s.id === "youtube-study-video-finder"), map.get("youtube.search-list")).part, "snippet");
assert.ok(!JSON.stringify(PROJECT_PRESENTATION).includes("regionCode"), "irrelevant optional region filter is not displayed");
assert.match(uiSource, /Full Technical Documentation/);
assert.match(uiSource, /Handled by the application/);
assert.match(uiSource, /Learning-focused extract/);

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
const lunch = data.scenarios.find((s) => s.id === "maps-lunch-spot-finder");
const lunchPlan = studentPlan(lunch, lunch.acceptedPlans[0]);
lunchPlan.requests[0].parameters["X-Goog-FieldMask"] = "places.displayName,places.formattedAddress,places.location,places.rating,places.currentOpeningHours";
assert.equal(validatePlan(data, lunch, lunchPlan).correct, true, "place ID remains optional when the displayed fields are selected");

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
