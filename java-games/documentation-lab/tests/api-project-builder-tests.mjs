import assert from "node:assert/strict";
import fs from "node:fs";
import { validateApiData, assertValid, validatePlan, formativeDiagnostics, endpointsFor, createScenarioPicker, isRuntimeParameter, isProductionContent, endpointMap } from "../api-project-builder-engine.js";
import { presentationFor, fieldMaskChoices, serializeMultiSelection, serializeArrayChoice, serializeNestedMultiChoice, responseSourceChoices, responseSourceControl, focusedFields, dependencySourceCandidates, dependencyConnectionControl, originControl, resolveRequestDependencies, controlsFor, requestHtml, putPath } from "../api-project-builder-ui.js";
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

// Step 3: dependency sources are resolved only from verified accepted-plan relationships.
let resolvedAcceptedPlanChecks = 0;
for (const scenario of publishedScenarios) for (const accepted of scenario.acceptedPlans || []) {
  const requests = studentPlan(scenario, accepted, expandedData, expandedMap);
  resolveRequestDependencies(scenario, requests.requests, expandedMap);
  const result = validatePlan(expandedData, scenario, requests);
  assert.equal(result.correct, true, `${scenario.id}/${accepted.id}: resolver preserves accepted-plan grading: ${JSON.stringify(result)}`);
  resolvedAcceptedPlanChecks++;
}
const dependencyControls = new Map();
for (const scenario of publishedScenarios) for (const plan of scenario.acceptedPlans || []) for (const step of plan.steps || []) {
  for (const [parameter, value] of Object.entries(step.parameters || {})) if (refs(value).length) dependencyControls.set(`${scenario.id}|${step.endpointId}|${parameter}`, { scenario, endpointId: step.endpointId, parameter });
}
let autoDependencyCount = 0, meaningfulChoiceCount = 0, multipleRequestSourceCount = 0;
for (const { scenario, endpointId, parameter } of dependencyControls.values()) {
  const endpoint = expandedMap.get(endpointId), parameterDef = endpoint.parameters.find((item) => item.name === parameter);
  const accepted = scenario.acceptedPlans.find((plan) => plan.steps.some((step) => step.endpointId === endpointId && refs(step.parameters?.[parameter]).length));
  const requests = studentPlan(scenario, accepted, expandedData, expandedMap).requests;
  const destinationIndex = accepted.steps.findIndex((step) => step.endpointId === endpointId && refs(step.parameters?.[parameter]).length);
  const hasContextAlternative = scenario.acceptedPlans.some((plan) => plan.steps.some((step) => step.endpointId === endpointId && Object.hasOwn(step.parameters || {}, parameter) && !refs(step.parameters[parameter]).length));
  if (hasContextAlternative) {
    meaningfulChoiceCount++;
    requests[destinationIndex].dependencies[parameter].source = "request";
  }
  resolveRequestDependencies(scenario, requests, expandedMap);
  const dependency = requests[destinationIndex].dependencies[parameter];
  const candidateSources = dependencySourceCandidates(scenario, endpointId, parameter, requests, destinationIndex, expandedMap);
  assert.ok(candidateSources.length > 0, `${scenario.id}/${parameter}: accepted source exists before dependent request`);
  if (hasContextAlternative) assert.equal(dependency.fromRequest, candidateSources[0].index, `${scenario.id}/${parameter}: choosing request data automatically identifies its sole API source`);
  if (candidateSources.length === 1) {
    if (!hasContextAlternative) autoDependencyCount++;
    assert.equal(dependency.fromRequest, candidateSources[0].index, `${scenario.id}/${parameter}: the sole compatible source is connected`);
    assert.equal(dependency.automatic, true, `${scenario.id}/${parameter}: automatic connection is marked for recomputation`);
    const control = dependencyConnectionControl(scenario, requests[destinationIndex], parameterDef, destinationIndex, requests, expandedMap);
    assert.match(control, /Uses information from Request/, `${scenario.id}/${parameter}: readable automatic connection is shown`);
    assert.doesNotMatch(control, /<select/, `${scenario.id}/${parameter}: a single-option request selector is omitted`);
    const source = expandedMap.get(requests[candidateSources[0].index].endpointId);
    const fields = responseSourceChoices(scenario, source, parameter);
    const requiredPaths = accepted.steps.flatMap((step) => step.endpointId === endpointId ? refs(step.parameters?.[parameter]).map((ref) => ref.path) : []);
    assert.ok(requiredPaths.every((path) => fields.some((field) => field.canonicalPath === path)), `${scenario.id}/${parameter}: automatic source resolution leaves required response-field choices available`);
  } else if (!hasContextAlternative) {
    multipleRequestSourceCount++;
    assert.ok(candidateSources.length > 1, `${scenario.id}/${parameter}: unresolved dependency still offers meaningful candidates`);
    const control = dependencyConnectionControl(scenario, requests[destinationIndex], parameterDef, destinationIndex, requests, expandedMap);
    assert.match(control, /<select data-dependency=/, `${scenario.id}/${parameter}: multiple compatible sources remain selectable`);
  }
}
assert.ok(autoDependencyCount > 0, "published dependencies include unambiguous sources to connect automatically");
// No enabled accepted plan currently supports multiple API source operations for one parameter.
assert.equal(multipleRequestSourceCount, 0, "no enabled response dependency has multiple accepted API source operations");
assert.equal(meaningfulChoiceCount, 1, "Museum Walk Planner keeps the meaningful project-context versus request-source decision");

const playlistScenario = expandedData.scenarios.find((scenario) => scenario.id === "spotify-my-playlists-browser");
const playlistAccepted = playlistScenario.acceptedPlans[0], playlistPlan = studentPlan(playlistScenario, playlistAccepted, expandedData, expandedMap);
const playlistList = playlistPlan.requests[0], playlistItems = playlistPlan.requests[1];
resolveRequestDependencies(playlistScenario, playlistPlan.requests, expandedMap);
assert.equal(playlistItems.dependencies.playlist_id.fromRequest, 0, "adding the sole playlist source automatically connects the item request");
assert.equal(playlistItems.dependencies.playlist_id.paths.length, 1, "automatic source selection preserves the response-field choice separately");
const playlistParam = expandedMap.get(playlistItems.endpointId).parameters.find((parameter) => parameter.name === "playlist_id");
assert.match(dependencyConnectionControl(playlistScenario, playlistItems, playlistParam, 1, playlistPlan.requests, expandedMap), /Uses information from Request 1: Get Current User/);
playlistPlan.requests.splice(0, 1);
resolveRequestDependencies(playlistScenario, playlistPlan.requests, expandedMap);
assert.equal(playlistItems.dependencies.playlist_id.fromRequest, null, "removing the source clears the stale binding");
assert.equal(playlistItems.dependencies.playlist_id.invalid, true, "removing the source marks the dependency unresolved");
assert.equal(Object.hasOwn(playlistItems.parameters, "playlist_id"), false, "removing the source clears its runtime binding");
assert.deepEqual(playlistItems.dependencies.playlist_id.paths, [], "removing the source clears stale selected response paths");
assert.match(dependencyConnectionControl(playlistScenario, playlistItems, playlistParam, 0, playlistPlan.requests, expandedMap), /Add an earlier request/);
playlistPlan.requests.unshift(playlistList);
resolveRequestDependencies(playlistScenario, playlistPlan.requests, expandedMap);
assert.equal(playlistItems.dependencies.playlist_id.fromRequest, 0, "adding the source back reconnects the dependency");
playlistPlan.requests.reverse();
resolveRequestDependencies(playlistScenario, playlistPlan.requests, expandedMap);
assert.equal(playlistItems.dependencies.playlist_id.fromRequest, null, "reordering the dependent request before its source clears the invalid ordering");
playlistPlan.requests.reverse();
resolveRequestDependencies(playlistScenario, playlistPlan.requests, expandedMap);
assert.equal(playlistItems.dependencies.playlist_id.fromRequest, 0, "restoring the valid order reconnects the source");
playlistPlan.requests[0].endpointId = "spotify.get-recently-played";
resolveRequestDependencies(playlistScenario, playlistPlan.requests, expandedMap);
assert.equal(playlistItems.dependencies.playlist_id.fromRequest, null, "replacing the source endpoint clears an incompatible binding");
assert.match(dependencyConnectionControl(playlistScenario, playlistItems, playlistParam, 1, playlistPlan.requests, expandedMap), /Add an earlier request/);

const rewind = expandedData.scenarios.find((scenario) => scenario.id === "spotify-session-rewind-saver"), rewindAccepted = rewind.acceptedPlans[0];
const rewindPlan = studentPlan(rewind, rewindAccepted, expandedData, expandedMap);
resolveRequestDependencies(rewind, rewindPlan.requests, expandedMap);
assert.equal(rewindPlan.requests[2].dependencies.playlist_id.fromRequest, 1, "Study Session Rewind Saver connects the created playlist");
assert.equal(rewindPlan.requests[2].dependencies.uris.fromRequest, 0, "Study Session Rewind Saver connects recently played tracks separately");
assert.deepEqual(rewindPlan.requests[2].dependencies.uris.paths, ["items[].track.uri"], "nested track response path remains independently selected");
assert.equal(validatePlan(expandedData, rewind, rewindPlan).correct, true, "automatic source request indexes and canonical paths retain evaluator semantics");

const museumDependencyScenario = expandedData.scenarios.find((scenario) => scenario.id === "maps-museum-walk-planner");
assert.ok(museumDependencyScenario.acceptedPlans.some((plan) => plan.steps.some((step) => step.endpointId === "maps.routes-compute-routes" && step.parameters.origin && !refs(step.parameters.origin).length)), "Museum Walk Planner retains its project-context origin alternative");
assert.ok(museumDependencyScenario.acceptedPlans.some((plan) => plan.steps.some((step) => step.endpointId === "maps.routes-compute-routes" && refs(step.parameters.origin).length)), "Museum Walk Planner retains its earlier-request origin alternative");
const museumRoutes = [{ endpointId: "maps.routes-compute-routes", parameters: {}, dependencies: {} }];
assert.match(originControl(museumDependencyScenario, museumRoutes, 0, museumRoutes[0], expandedMap), /Hotel address from project/);
assert.match(originControl(museumDependencyScenario, museumRoutes, 0, museumRoutes[0], expandedMap), /Earlier geocoding response/);

const deferredMix = expandedData.scenarios.find((scenario) => scenario.id === "youtube-study-mix-copier"), deferredAccepted = deferredMix.acceptedPlans[0];
const deferredPlan = studentPlan(deferredMix, deferredAccepted, expandedData, expandedMap);
resolveRequestDependencies(deferredMix, deferredPlan.requests, expandedMap);
const deferredDestination = deferredPlan.requests.find((request) => request.endpointId === "youtube.playlistitems-insert");
assert.ok(deferredDestination, "deferred Study Mix Copier still has its authored destination request");
deferredDestination.dependencies.snippet.fromRequest = null;
deferredDestination.dependencies.snippet.paths = [];
const mixCandidates = dependencySourceCandidates(deferredMix, deferredDestination.endpointId, "snippet", deferredPlan.requests, 2, expandedMap);
assert.equal(mixCandidates.length, 2, "deferred Study Mix Copier identifies both distinct earlier response sources");
assert.equal(deferredDestination.dependencies.snippet.fromRequest, null, "the two-source dependency is never guessed as one automatic source");
assert.match(dependencyConnectionControl(deferredMix, deferredDestination, expandedMap.get(deferredDestination.endpointId).parameters.find((parameter) => parameter.name === "snippet"), 2, deferredPlan.requests, expandedMap), /more than one earlier response/);
deferredPlan.requests.splice(0, 1);
resolveRequestDependencies(deferredMix, deferredPlan.requests, expandedMap);
assert.equal(deferredPlan.requests[1].dependencies.snippet.fromRequest, null, "Study Mix never auto-connects only one part of a two-source dependency");
assert.equal(deferredMix.stage1Compatible, false, "the two-source repeated-request format remains disabled");
console.log(`Dependency handling: ${dependencyControls.size} enabled controls inspected, ${autoDependencyCount} API sources connected automatically, ${meaningfulChoiceCount} meaningful source choice retained, ${multipleRequestSourceCount} multiple-request choices available; ${resolvedAcceptedPlanChecks} accepted-plan variants remained correct after resolution; add/remove/reorder and disabled Study Mix dependency checks passed.`);

// Targeted full-control coverage: construct these plans from the same parameter
// groups and renderers used by the student page, then grade those serialized values.
const configRepairIds = ["spotify-session-rewind-saver", "tiktok-club-recap-publisher", "discord-event-volunteer-desk"];
const configRepairStats = { controls: 0, accepted: 0, incorrect: 0 };
for (const id of configRepairIds) {
  const scenario = expandedData.scenarios.find((item) => item.id === id);
  for (const accepted of scenario.acceptedPlans) {
    const requests = accepted.steps.map((step) => {
      const endpoint = expandedMap.get(step.endpointId), groups = classification(scenario, endpoint), parameters = automaticParameters(scenario, endpoint), dependencies = {};
      for (const name of groups.assessed) {
        const value = step.parameters[name];
        if (value === undefined || refs(value).length) continue;
        const nested = presentation(scenario, endpoint).nestedChoices?.[name];
        if (nested) for (const [path, options] of Object.entries(nested)) {
          const answer = path.split(".").reduce((node, key) => node?.[key], value);
          assert.ok(options.includes(answer), `${id}/${endpoint.id}.${name}.${path}: accepted setting is selectable`);
          parameters[name] = putPath(parameters[name] || {}, path, answer);
        }
        else parameters[name] = structuredClone(value);
      }
      return { endpointId: step.endpointId, parameters, dependencies };
    });
    const submitted = { requests };
    resolveRequestDependencies(scenario, requests, expandedMap);
    for (let i = 0; i < accepted.steps.length; i++) for (const [name, value] of Object.entries(accepted.steps[i].parameters)) {
      const refsForParam = refs(value);
      if (!refsForParam.length) continue;
      const expectedSource = accepted.steps.findIndex((candidate) => candidate.step === refsForParam[0].$fromStep);
      requests[i].dependencies[name] = { ...requests[i].dependencies[name], source: "request", fromRequest: expectedSource, paths: refsForParam.map((ref) => ref.path) };
    }
    const markup = requestHtml(requests, expandedMap, scenario);
    for (let i = 0; i < accepted.steps.length; i++) {
      const endpoint = expandedMap.get(accepted.steps[i].endpointId), groups = classification(scenario, endpoint);
      for (const name of groups.assessed) {
        const parameter = endpoint.parameters.find((item) => item.name === name);
        const control = controlsFor(parameter, requests[i], i, requests, scenario, expandedMap);
        assert.ok(control && !control.includes("No settings to choose"), `${id}/${endpoint.id}.${name}: the visible student control is generated`);
        if (refs(accepted.steps[i].parameters[name]).length) {
          assert.match(control, /data-dependency-path=/, `${id}.${name}: response-source selector is rendered`);
          for (const ref of refs(accepted.steps[i].parameters[name])) assert.ok(control.includes(`value="${ref.path}"`), `${id}.${name}: required canonical response path remains selectable`);
        }
        else if (presentation(scenario, endpoint).nestedChoices?.[name]) assert.match(control, /type="radio"[^>]*data-nested-choice=/, `${id}.${name}: nested single-choice control is rendered as radio buttons`);
        else if (presentation(scenario, endpoint).numericOptions?.[name]) assert.match(control, /<select data-param=/, `${id}.${name}: meaningful numeric choices use a selector`);
        else assert.match(control, new RegExp(`data-param="${name}"`), `${id}.${name}: value is serialized by the shared parameter control`);
        configRepairStats.controls++;
      }
    }
    const result = validatePlan(expandedData, scenario, submitted);
    assert.equal(result.correct, true, `${id}/${accepted.id}: represented student controls produce accepted plan: ${JSON.stringify(result)}`);
    configRepairStats.accepted++;
    const bad = structuredClone(submitted);
    if (id === "spotify-session-rewind-saver") {
      const limit = bad.requests.find((request) => request.endpointId === "spotify.get-recently-played");
      limit.parameters.limit = 10;
      assert.ok([10, 20, 30, 50].includes(limit.parameters.limit), "Spotify incorrect limit is available in the student options");
    } else if (id === "tiktok-club-recap-publisher") {
      const post = bad.requests.find((request) => request.endpointId === "tiktok.direct-post-video-init");
      post.parameters.post_info = putPath(post.parameters.post_info, "privacy_level", "PUBLIC_TO_EVERYONE");
      assert.ok(presentation(scenario, expandedMap.get(post.endpointId)).nestedChoices.post_info.privacy_level.includes("PUBLIC_TO_EVERYONE"), "TikTok plausible incorrect privacy choice is offered");
    } else {
      const limit = bad.requests.find((request) => request.endpointId === "discord.search-guild-members");
      limit.parameters.limit = 5;
      assert.ok([5, 10, 20].includes(limit.parameters.limit), "Discord incorrect result limit is available in the student options");
    }
    assert.equal(validatePlan(expandedData, scenario, bad).correct, false, `${id}: plausible incorrect assessed setting is rejected`);
    configRepairStats.incorrect++;
    assert.ok(markup.includes("data-dependency-path"), `${id}: accepted response-path choice remains in the rendered request plan`);
  }
}
assert.equal(configRepairStats.accepted, 4, "all accepted alternatives for the three repaired projects are constructible");
console.log(`Configuration-control repairs: ${configRepairIds.length} projects; ${configRepairStats.controls} assessed controls generated, ${configRepairStats.accepted} accepted-plan variants constructible, ${configRepairStats.incorrect} plausible incorrect settings rejected.`);

// Google Maps configuration coverage: build each accepted plan from the same
// app-handled metadata and rendered controls students receive in the planner.
const mapsRepairIds = ["maps-class-dinner-checklist", "maps-trip-destination-picker", "maps-venue-distance-board", "maps-late-start-bus-check"];
const mapsRepairStats = { acceptedPlans: 0, assessedControls: 0, appHandled: 0, incorrect: 0 };
function representedMapsPlan(scenario, accepted) {
  const requests = accepted.steps.map((step, requestIndex) => {
    const endpoint = expandedMap.get(step.endpointId), config = presentation(scenario, endpoint), groups = classification(scenario, endpoint);
    const parameters = automaticParameters(scenario, endpoint), dependencies = {};
    for (const [name, expected] of Object.entries(step.parameters)) {
      const parameter = endpoint.parameters.find((item) => item.name === name), references = refs(expected);
      if (references.length) {
        const ref = references[0], sourceStep = accepted.steps.findIndex((candidate) => candidate.step === ref.$fromStep);
        dependencies[name] = { fromRequest: sourceStep, paths: references.map((item) => item.path) };
        parameters[name] = { $runtime: true };
        continue;
      }
      if (groups.automatic.includes(name)) {
        assert.ok(Object.hasOwn(parameters, name), `${scenario.id}/${endpoint.id}.${name}: app supplies accepted setting`);
        continue;
      }
      if (!groups.assessed.includes(name)) continue;
      const control = controlsFor(parameter, { endpointId: endpoint.id, parameters, dependencies }, requestIndex, [], scenario, expandedMap);
      assert.ok(control && !control.includes("No settings to choose"), `${scenario.id}/${endpoint.id}.${name}: student control is rendered`);
      mapsRepairStats.assessedControls++;
      if (name === "X-Goog-FieldMask") {
        const selected = String(expected).split(",");
        for (const path of selected) assert.ok(control.includes(`value="${path}"`), `${scenario.id}: mask field ${path} is selectable`);
        parameters[name] = selected.join(",");
      } else if (config.arrayOptions?.[name]) {
        const option = config.arrayOptions[name].find((candidate) => JSON.stringify(candidate.value) === JSON.stringify(expected));
        assert.ok(option, `${scenario.id}: accepted array setting has a radio option`);
        assert.match(control, /type="radio"[^>]*data-param-array-choice=/, `${scenario.id}: a single array choice uses radio buttons`);
        const choiceIndex = config.arrayOptions[name].indexOf(option);
        parameters[name] = serializeArrayChoice(config, name, choiceIndex);
      } else if (config.nestedMultiChoices?.[name]) {
        for (const [path, options] of Object.entries(config.nestedMultiChoices[name])) {
          const values = path.split(".").reduce((node, key) => node?.[key], expected);
          assert.ok(Array.isArray(values), `${scenario.id}: the accepted nested setting remains an array`);
          for (const value of values) assert.ok(options.some((option) => option.value === value), `${scenario.id}: ${value} is selectable`);
          assert.match(control, /type="checkbox"[^>]*data-nested-multi-choice=/, `${scenario.id}: multiple transit modes use checkboxes`);
        }
        parameters[name] = Object.entries(config.nestedMultiChoices[name]).reduce((current, [path]) => {
          const values = path.split(".").reduce((node, key) => node?.[key], expected);
          return serializeNestedMultiChoice(current, path, values);
        }, {});
      } else parameters[name] = structuredClone(expected);
    }
    return { endpointId: endpoint.id, parameters, dependencies };
  });
  return { requests };
}
for (const id of mapsRepairIds) {
  const scenario = expandedData.scenarios.find((item) => item.id === id);
  for (const accepted of scenario.acceptedPlans) {
    const represented = representedMapsPlan(scenario, accepted);
    assert.equal(validatePlan(expandedData, scenario, represented).correct, true, `${id}/${accepted.id}: UI-representable plan passes`);
    mapsRepairStats.acceptedPlans++;
    for (const request of represented.requests) {
      const endpoint = expandedMap.get(request.endpointId), config = presentation(scenario, endpoint), groups = classification(scenario, endpoint);
      for (const name of groups.automatic) {
        const item = endpoint.parameters.find((parameter) => parameter.name === name);
        assert.ok(requestHtml([request], expandedMap, scenario).includes("Handled by the application"), `${id}: app-handled settings are explained in the plan UI`);
        if (name === "origins" || name === "destinations" || name === "origin" || name === "destination") {
          assert.deepEqual(request.parameters[name], { $runtime: true }, `${id}/${name}: app uses symbolic configured locations, not typed coordinates or IDs`);
        }
        if (name === "X-Goog-FieldMask") assert.equal(request.parameters[name], stepMask(accepted, request.endpointId), `${id}: field mask reaches evaluator in canonical form`);
        mapsRepairStats.appHandled++;
      }
    }
    const wrong = structuredClone(represented);
    if (id === "maps-class-dinner-checklist") wrong.requests[0].parameters["X-Goog-FieldMask"] = "displayName,priceLevel,rating,userRatingCount,formattedAddress,currentOpeningHours";
    else if (id === "maps-trip-destination-picker") wrong.requests[0].parameters.includedRegionCodes = ["ca"];
    else if (id === "maps-late-start-bus-check") wrong.requests[0].parameters.transitPreferences.allowedTravelModes.push("SUBWAY");
    else continue; // Both documented venue strategies are intentionally accepted.
    assert.equal(validatePlan(expandedData, scenario, wrong).correct, false, `${id}: plausible incorrect student choice is rejected`);
    mapsRepairStats.incorrect++;
  }
}
function stepMask(accepted, endpointId) { return accepted.steps.find((step) => step.endpointId === endpointId).parameters["X-Goog-FieldMask"]; }
assert.equal(mapsRepairStats.acceptedPlans, 5, "all Maps accepted plan variants, including the alternative with three separate Routes calls, are representable");
assert.equal(mapsRepairStats.incorrect, 3, "incorrect Maps field, region, and bus-mode choices are rejected");
console.log(`Google Maps configuration repairs: ${mapsRepairIds.length} projects; ${mapsRepairStats.acceptedPlans} accepted-plan variants represented; ${mapsRepairStats.assessedControls} assessed controls generated; ${mapsRepairStats.appHandled} app-handled settings serialized; ${mapsRepairStats.incorrect} plausible incorrect choices rejected.`);

const enabledCoverage = publishedScenarios.map((scenario) => {
  const blockers = new Set();
  for (const accepted of scenario.acceptedPlans) for (const step of accepted.steps) {
    const endpoint = expandedMap.get(step.endpointId), groups = classification(scenario, endpoint), handled = automaticParameters(scenario, endpoint);
    for (const parameter of endpoint.parameters) {
      if (!parameter.required || !Object.hasOwn(step.parameters, parameter.name)) continue;
      if (groups.assessed.includes(parameter.name) || groups.automatic.includes(parameter.name) || Object.hasOwn(handled, parameter.name) || parameter.in === "path") continue;
      blockers.add(`${endpoint.id}.${parameter.name}`);
    }
  }
  return { id: scenario.id, blockers: [...blockers] };
});
const fullyConstructible = enabledCoverage.filter((item) => !item.blockers.length);
assert.ok(configRepairIds.every((id) => enabledCoverage.find((item) => item.id === id)?.blockers.length === 0), "the three targeted projects have no required settings without controls or application handling");
console.log(`Enabled-scenario required-control audit: ${enabledCoverage.length} checked; ${fullyConstructible.length} have all required settings represented by a student control, application value, runtime path, or dependency. Additional blockers: ${enabledCoverage.filter((item) => item.blockers.length).map((item) => `${item.id} (${item.blockers.join(", ")})`).join("; ") || "none"}.`);

// YouTube part settings: assess meaningful information selection, and handle the
// snippet-only subscription response in the app because the project assesses access rules.
for (const [id, endpointId, expectedPart, assessed] of [
  ["youtube-gaming-trend-wall", "youtube.videos-list", "snippet,statistics", true],
  ["youtube-subscription-swap", "youtube.subscriptions-list", "snippet", false],
  ["youtube-media-club-playlist-shelf", "youtube.playlists-list", "snippet,contentDetails", true],
]) {
  const scenario = expandedData.scenarios.find((item) => item.id === id), endpoint = expandedMap.get(endpointId);
  const config = presentation(scenario, endpoint), groups = classification(scenario, endpoint);
  const allowed = endpoint.parameters.find((item) => item.name === "part").allowedValues;
  if (assessed) {
    assert.ok(groups.assessed.includes("part"), `${id}: part is an assessed data-selection decision`);
    assert.ok(config.partOptions?.length >= 3 && config.partOptions.length <= 5, `${id}: the curated part control stays focused`);
    assert.ok(config.partOptions.every((value) => allowed.includes(value)), `${id}: each offered part is documented for this endpoint`);
    const seed = automaticParameters(scenario, endpoint);
    const requiredAutomatic = id === "youtube-gaming-trend-wall"
      ? { chart: "mostPopular", regionCode: "US", videoCategoryId: { $runtime: true } }
      : { channelId: { $runtime: true }, maxResults: 25 };
    for (const [name, value] of Object.entries(requiredAutomatic)) assert.deepEqual(seed[name], value, `${id}: ${name} is supplied by the application as specified`);
    const request = { endpointId, parameters: { ...seed, part: "" }, dependencies: {} };
    const control = controlsFor(endpoint.parameters.find((item) => item.name === "part"), request, 0, [request], scenario, expandedMap);
    assert.match(control, /data-param-multi="part"/, `${id}: part values are selectable in the rendered multiselect`);
    for (const value of expectedPart.split(",")) assert.match(control, new RegExp(`value="${value}"`), `${id}: required ${value} part is offered`);
    const accepted = scenario.acceptedPlans[0], represented = studentPlan(scenario, accepted, expandedData, expandedMap);
    assert.equal(validatePlan(expandedData, scenario, represented).correct, true, `${id}: accepted combination passes the evaluator`);
    const bad = structuredClone(represented); bad.requests[0].parameters.part = expectedPart.split(",")[0];
    assert.equal(validatePlan(expandedData, scenario, bad).correct, false, `${id}: incomplete plausible part choice is rejected`);
  } else {
    assert.ok(!groups.assessed.includes("part") && groups.automatic.includes("part"), `${id}: the app handles the non-target part setting`);
    const automatic = automaticParameters(scenario, endpoint);
    assert.equal(automatic.part, expectedPart, `${id}: exact documented part is serialized automatically`);
    assert.deepEqual({ order: automatic.order, maxResults: automatic.maxResults }, { order: "alphabetical", maxResults: 50 }, `${id}: sorting and shelf size are application-handled`);
    assert.ok(groups.assessed.includes("mine") && groups.assessed.includes("channelId"), `${id}: the two different subscription filters remain meaningful decisions`);
    for (const name of ["mine", "channelId"]) {
      const value = scenario.acceptedPlans[0].steps[0].parameters[name];
      const request = { endpointId, parameters: { ...automatic, ...(name === "mine" ? { mine: true } : { channelId: { $runtime: true } }) }, dependencies: {} };
      const control = controlsFor(endpoint.parameters.find((item) => item.name === name), request, 0, [request], scenario, expandedMap);
      assert.ok(control && !control.includes("No settings to choose"), `${id}: ${name} has a visible student control`);
    }
    const accepted = scenario.acceptedPlans[0], represented = studentPlan(scenario, accepted, expandedData, expandedMap);
    assert.ok(represented.requests.every((request) => request.parameters.part === expectedPart), `${id}: app-handled value reaches both requests`);
    assert.equal(validatePlan(expandedData, scenario, represented).correct, true, `${id}: app-handled plan passes the evaluator`);
  }
}

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
    assert.equal(reachable.correct, true, `${scenario.id}/${accepted.id}: focused UI can reach accepted plan: ${JSON.stringify(reachable)}`);
  }
}
assert.equal(focusedInventory.length, 9);
assert.deepEqual(classification(data.scenarios.find((s) => s.id === "youtube-study-video-finder"), map.get("youtube.search-list")).assessed, ["type", "videoDuration", "maxResults"]);
assert.equal(automaticParameters(data.scenarios.find((s) => s.id === "youtube-study-video-finder"), map.get("youtube.search-list")).q.$runtime, true);
assert.equal(automaticParameters(data.scenarios.find((s) => s.id === "youtube-study-video-finder"), map.get("youtube.search-list")).part, "snippet");
assert.ok(!presentation(data.scenarios.find((s) => s.id === "youtube-study-video-finder"), map.get("youtube.search-list")).automatic.regionCode, "irrelevant optional region filter remains hidden in unrelated projects");
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
