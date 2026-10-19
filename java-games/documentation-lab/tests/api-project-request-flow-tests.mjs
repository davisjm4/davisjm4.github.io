import assert from "node:assert/strict";
import fs from "node:fs";
import { buildRequestFlowModel, requestFlowHtml } from "../api-project-request-flow.js";
import { endpointMap, validatePlan } from "../api-project-builder-engine.js";
import { resolveRequestDependencies } from "../api-project-builder-ui.js";

const read = (name) => JSON.parse(fs.readFileSync(new URL(`../${name}`, import.meta.url), "utf8"));
const index = read("api-project-data-v1-runtime-index.json");
const parts = index.runtimeParts.map((path) => read(path.replace(/^\.\//, "")));
const data = { schemaVersion: parts[0].schemaVersion, providers: parts.flatMap((part) => part.providers), scenarios: parts.flatMap((part) => part.scenarios) };
const scenarios = data.scenarios.filter((item) => item.stage1Compatible === true && !(item.engineSupportRequired || []).length);
const map = endpointMap(data);
const scenario = (id) => scenarios.find((item) => item.id === id);
const refs = (value, found = []) => {
  if (value && typeof value === "object" && "$fromStep" in value) found.push(value);
  else if (value && typeof value === "object") Object.values(value).forEach((child) => refs(child, found));
  else if (Array.isArray(value)) value.forEach((child) => refs(child, found));
  return found;
};
function studentPlan(challenge, accepted) {
  return { requests: accepted.steps.map((step) => {
    const endpoint = map.get(step.endpointId), parameters = {}, dependencies = {};
    for (const [name, value] of Object.entries(step.parameters || {})) {
      const sourceRefs = refs(value);
      if (sourceRefs.length) {
        dependencies[name] = { source: "request", fromRequest: accepted.steps.findIndex((candidate) => candidate.step === sourceRefs[0].$fromStep), paths: [...new Set(sourceRefs.map((ref) => ref.path))] };
        parameters[name] = { $runtime: true };
      } else if (endpoint.parameters.find((parameter) => parameter.name === name)?.in === "path") continue;
      else parameters[name] = structuredClone(value);
    }
    return { endpointId: step.endpointId, parameters, dependencies };
  }) };
}

const rewind = scenario("spotify-session-rewind-saver");
const rewindPlan = studentPlan(rewind, rewind.acceptedPlans[0]);
resolveRequestDependencies(rewind, rewindPlan.requests, map);
const rewindSnapshot = structuredClone(rewindPlan);
const rewindModel = buildRequestFlowModel(rewind, rewindPlan.requests, map);
assert.equal(rewindModel.nodes.length, 3, "multiple-operation plan has one node per selected request");
assert.equal(rewindModel.edges.length, 2, "two separate inputs create two incoming dependencies");
assert.deepEqual(rewindModel.edges.map((edge) => [edge.sourceIndex, edge.destinationIndex]).sort((a, b) => a[0] - b[0]), [[0, 2], [1, 2]]);
assert.ok(rewindModel.edges.some((edge) => /Spotify URI/i.test(edge.label)), "selected track response path gets its curated label");
assert.ok(rewindModel.edges.some((edge) => /playlist.*ID/i.test(edge.label)), "playlist response path gets its curated label");
assert.deepEqual(rewindPlan, rewindSnapshot, "deriving a diagram never changes the student submission");
const rewindHtml = requestFlowHtml(rewindModel);
assert.match(rewindHtml, /How Your Requests Connect/);
assert.match(rewindHtml, /Request 1.*Request 3/s);

// Independent operations appear in order without an invented relationship.
const youtube = scenario("youtube-study-video-finder");
const youtubeAccepted = studentPlan(youtube, youtube.acceptedPlans[0]);
resolveRequestDependencies(youtube, youtubeAccepted.requests, map);
const independent = structuredClone(youtubeAccepted.requests);
independent[1].dependencies = {};
const independentModel = buildRequestFlowModel(youtube, independent, map);
assert.equal(independentModel.nodes.length, 2);
assert.equal(independentModel.edges.length, 0, "independent requests are not connected by sequence alone");
const youtubeModel = buildRequestFlowModel(youtube, youtubeAccepted.requests, map);
assert.equal(youtubeModel.edges.length, 1, "actual search-to-details dependency is shown");
assert.equal(youtubeModel.edges[0].sourceIndex, 0);
assert.equal(youtubeModel.edges[0].destinationIndex, 1);

// Three-operation workflow and mixed application/request inputs.
const tiktok = scenario("tiktok-club-recap-publisher");
const tiktokPlan = studentPlan(tiktok, tiktok.acceptedPlans[0]);
resolveRequestDependencies(tiktok, tiktokPlan.requests, map);
const tiktokModel = buildRequestFlowModel(tiktok, tiktokPlan.requests, map);
assert.equal(tiktokModel.nodes.length, 3);
assert.equal(tiktokModel.edges.length, 1);
assert.equal(tiktokModel.edges[0].sourceIndex, 1);
assert.equal(tiktokModel.edges[0].destinationIndex, 2);
assert.ok(tiktokModel.nodes[1].inputs.some((label) => /video/i.test(label)), "the simulated video is shown as an app input");

const lecture = scenario("openai-lecture-recap");
const lecturePlan = studentPlan(lecture, lecture.acceptedPlans[0]);
resolveRequestDependencies(lecture, lecturePlan.requests, map);
const lectureModel = buildRequestFlowModel(lecture, lecturePlan.requests, map);
assert.equal(lectureModel.nodes.length, 2, "transcription and recap remain distinct operations");
assert.equal(lectureModel.edges.length, 1, "transcript dependency is visible");
assert.ok(lectureModel.nodes[0].inputs.some((label) => /lecture audio/i.test(label)), "simulated audio appears as application input, not a request node");
assert.ok(lectureModel.nodes[1].inputs.length > 0, "app-provided recap instructions are grouped on the consuming request");

// Single request, request-context input, and missing source states.
const venue = scenario("maps-venue-distance-board");
const venuePlan = studentPlan(venue, venue.acceptedPlans[0]);
const venueModel = buildRequestFlowModel(venue, venuePlan.requests, map);
assert.equal(venueModel.nodes.length, 1);
assert.equal(venueModel.edges.length, 0);
assert.match(requestFlowHtml(venueModel), /without another API request/);

const volunteer = scenario("discord-event-volunteer-desk");
const volunteerPlan = studentPlan(volunteer, volunteer.acceptedPlans[0]);
resolveRequestDependencies(volunteer, volunteerPlan.requests, map);
const missingSource = structuredClone(volunteerPlan.requests);
missingSource[1].dependencies.user_id = { source: "request", fromRequest: null, paths: [] };
const missingModel = buildRequestFlowModel(volunteer, missingSource, map);
assert.equal(missingModel.edges.length, 0);
assert.ok(missingModel.nodes[1].unresolved.some((item) => item.text === "Source not selected"));
assert.match(requestFlowHtml(missingModel), /Source not selected/);

// A valid but wrong selected response field is drawn as selected, not corrected.
const wrongField = structuredClone(rewindPlan.requests);
wrongField[2].dependencies.uris.paths = ["items[].track.name"];
const wrongFieldModel = buildRequestFlowModel(rewind, wrongField, map);
assert.equal(wrongFieldModel.edges.length, 2);
assert.ok(wrongFieldModel.edges.some((edge) => /display name/i.test(edge.label)), "wrong selected field remains visible as the student's actual choice");
assert.ok(!wrongFieldModel.edges.some((edge) => edge.parameter === "uris" && /Spotify URI/i.test(edge.label)), "the diagram does not replace a wrong choice with the accepted field");

// A removed/stale source and a replaced endpoint never produce phantom arrows.
const stale = structuredClone(rewindPlan.requests);
stale.splice(0, 1);
stale[1].dependencies.uris = { source: "request", fromRequest: null, paths: [], invalid: true };
const staleModel = buildRequestFlowModel(rewind, stale, map);
assert.equal(staleModel.edges.length, 0);
assert.ok(staleModel.nodes[1].unresolved.some((item) => /no longer available/.test(item.text)));
const replaced = structuredClone(rewindPlan.requests);
replaced[0].endpointId = "spotify.get-artist";
const replacedModel = buildRequestFlowModel(rewind, replaced, map);
assert.ok(!replacedModel.edges.some((edge) => edge.sourceIndex === 0 && edge.destinationIndex === 2), "endpoint replacement cannot retain an undocumented field edge");
assert.ok(replacedModel.nodes[2].unresolved.some((item) => /field is unavailable/.test(item.text)));

// Reordered requests use their current order and current binding indexes.
const reordered = studentPlan(rewind, rewind.acceptedPlans[1]);
resolveRequestDependencies(rewind, reordered.requests, map);
const reorderedModel = buildRequestFlowModel(rewind, reordered.requests, map);
assert.deepEqual(reorderedModel.nodes.map((node) => node.number), [1, 2, 3]);
assert.deepEqual(reorderedModel.nodes.map((node) => node.title), ["Create Playlist", "Get Recently Played Tracks", "Add Items to Playlist"]);
assert.ok(reorderedModel.edges.some((edge) => edge.sourceIndex === 0 && edge.destinationIndex === 2));
assert.ok(reorderedModel.edges.some((edge) => edge.sourceIndex === 1 && edge.destinationIndex === 2));

// Multiple bindings for one parameter are represented independently.
const multipleBindings = structuredClone(rewindPlan.requests);
multipleBindings[2].dependencies.uris = { source: "request", bindings: [
  { fromRequest: 0, paths: ["items[].track.uri"] },
  { fromRequest: 1, paths: ["id"] },
] };
const multiModel = buildRequestFlowModel(rewind, multipleBindings, map);
assert.ok(multiModel.edges.some((edge) => edge.sourceIndex === 0 && edge.path === "items[].track.uri"));
assert.ok(multiModel.edges.some((edge) => edge.sourceIndex === 1 && edge.path === "id"));

// Array and nested paths preserve structural identity and readable labels.
assert.ok(rewindModel.edges.some((edge) => edge.path === "items[].track.uri"));
assert.ok(youtubeModel.edges.some((edge) => /video ID/i.test(edge.label)));
assert.ok(volunteerPlan.requests[1].dependencies.user_id.paths[0].includes("[].user.id"));

// A visualization cannot alter grading, for either accepted or incorrect plans.
const acceptedResultBefore = validatePlan(data, rewind, rewindPlan);
buildRequestFlowModel(rewind, rewindPlan.requests, map);
assert.equal(validatePlan(data, rewind, rewindPlan).correct, acceptedResultBefore.correct);
assert.equal(acceptedResultBefore.correct, true);
const rejectedPlan = structuredClone(rewindPlan);
rejectedPlan.requests[2].dependencies.uris.paths = ["items[].track.name"];
const rejectedBefore = validatePlan(data, rewind, rejectedPlan);
buildRequestFlowModel(rewind, rejectedPlan.requests, map);
assert.equal(validatePlan(data, rewind, rejectedPlan).correct, rejectedBefore.correct);
assert.equal(rejectedBefore.correct, false);

// Broad check: all accepted plans for all published scenarios produce one node
// per selected operation and an edge for each documented current source path.
let scenarioPlansChecked = 0, representedEdges = 0;
for (const challenge of scenarios) for (const accepted of challenge.acceptedPlans || []) {
  const plan = studentPlan(challenge, accepted);
  resolveRequestDependencies(challenge, plan.requests, map);
  const before = structuredClone(plan);
  const flow = buildRequestFlowModel(challenge, plan.requests, map);
  assert.equal(flow.nodes.length, plan.requests.length, `${challenge.id}/${accepted.id}: diagram includes every selected request`);
  assert.deepEqual(plan, before, `${challenge.id}/${accepted.id}: diagram is read-only`);
  assert.ok(flow.edges.every((edge) => edge.sourceIndex < edge.destinationIndex), `${challenge.id}/${accepted.id}: dependency arrows point from earlier current steps`);
  assert.ok(flow.nodes.every((node, index) => node.number === index + 1), `${challenge.id}/${accepted.id}: request numbers follow current order`);
  representedEdges += flow.edges.length;
  scenarioPlansChecked++;
}
assert.equal(scenarioPlansChecked, 54);
console.log(`Request-flow diagram: ${scenarioPlansChecked} accepted plans across ${scenarios.length} enabled scenarios; ${representedEdges} current dependency edges; single/independent requests, chains, multi-input destinations, app inputs, unresolved/stale sources, wrong fields, reorderings, and read-only grading passed.`);
