import assert from "node:assert/strict";
import fs from "node:fs";
import { createScenarioPicker, endpointMap, isRuntimeParameter, validatePlan } from "../api-project-builder-engine.js";
import { presentation, classification, automaticParameters, scenarioDifficulty, SCENARIO_DIFFICULTY } from "../api-project-presentation.js";
import { readablePlan, requestHtml, responseSourceChoices } from "../api-project-builder-ui.js";
import { createSessionTracker } from "../../session.js";

const read = (name) => JSON.parse(fs.readFileSync(new URL(`../${name}`, import.meta.url), "utf8"));
const index = read("api-project-data-v1-runtime-index.json");
const parts = index.runtimeParts.map((path) => read(path.replace(/^\.\//, "")));
const data = { schemaVersion: parts[0].schemaVersion, providers: parts.flatMap((part) => part.providers), scenarios: parts.flatMap((part) => part.scenarios) };
const enabled = data.scenarios.filter((scenario) => scenario.stage1Compatible === true && !(scenario.engineSupportRequired || []).length);
const map = endpointMap(data);
assert.equal(enabled.length, 36);
assert.equal(new Set(enabled.map((scenario) => scenarioDifficulty(scenario))).size, 3);
for (const scenario of enabled) assert.ok(Object.hasOwn(SCENARIO_DIFFICULTY, scenario.id), `${scenario.id} has explicit difficulty metadata`);
const distribution = Object.values(SCENARIO_DIFFICULTY).reduce((counts, level) => ({ ...counts, [level]: (counts[level] || 0) + 1 }), {});
assert.deepEqual(distribution, { beginner: 11, intermediate: 19, advanced: 6 });

let seed = 7129;
const rng = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
const picker = createScenarioPicker(data, rng);
for (const [provider, difficulty, expectedCount] of [["all", "beginner", 11], ["all", "intermediate", 19], ["all", "advanced", 6], ["spotify", "advanced", 1]]) {
  const firstCycle = Array.from({ length: expectedCount }, () => picker(provider, difficulty));
  assert.ok(firstCycle.every(Boolean));
  assert.equal(new Set(firstCycle.map((scenario) => scenario.id)).size, expectedCount, `${provider}/${difficulty}: no repeat before queue exhaustion`);
  const next = picker(provider, difficulty);
  assert.ok(next);
  if (expectedCount > 1) assert.notEqual(next.id, firstCycle.at(-1).id, `${provider}/${difficulty}: cycle boundary avoids immediate repeat`);
}
assert.equal(picker("tiktok", "beginner"), null, "empty provider/difficulty combinations do not fall back to another level");
const allQueue = createScenarioPicker(data, rng), allFirstCycle = Array.from({ length: 36 }, () => allQueue());
assert.equal(new Set(allFirstCycle.map((scenario) => scenario.id)).size, 36, "mixed practice reaches every enabled project before repeating");
assert.ok(allFirstCycle.every((scenario) => scenario.stage1Compatible === true && !(scenario.engineSupportRequired || []).length), "deferred formats never enter the queue");

function references(value, out = []) {
  if (value && typeof value === "object" && Object.hasOwn(value, "$fromStep")) out.push(value);
  else if (value && typeof value === "object") Object.values(value).forEach((child) => references(child, out));
  else if (Array.isArray(value)) value.forEach((child) => references(child, out));
  return out;
}
let answerVariants = 0, automaticSections = 0;
for (const scenario of enabled) for (const accepted of scenario.acceptedPlans) {
  const constructed = accepted.steps.map((step) => {
    const endpoint = map.get(step.endpointId), request = { endpointId: step.endpointId, parameters: {}, dependencies: {} };
    for (const [name, value] of Object.entries(step.parameters || {})) {
      const refs = references(value), parameter = endpoint.parameters.find((item) => item.name === name);
      if (refs.length) {
        const bindings = new Map();
        for (const ref of refs) {
          const fromRequest = accepted.steps.findIndex((source) => source.step === ref.$fromStep), paths = bindings.get(fromRequest) || [];
          if (!paths.includes(ref.path)) paths.push(ref.path);
          bindings.set(fromRequest, paths);
        }
        const entries = [...bindings].map(([fromRequest, paths]) => ({ fromRequest, paths }));
        request.dependencies[name] = { fromRequest: entries[0]?.fromRequest, paths: entries[0]?.paths || [], ...(entries.length > 1 ? { bindings: entries } : {}) };
        request.parameters[name] = { $runtime: true };
      } else if (isRuntimeParameter(parameter, value)) {
        if (parameter.in !== "path") request.parameters[name] = structuredClone(value?.$runtime ? value : { $runtime: true });
      } else request.parameters[name] = structuredClone(value);
    }
    return request;
  });
  assert.equal(validatePlan(data, scenario, { requests: constructed }).correct, true, `${scenario.id}/${accepted.id}: evaluator semantics are unchanged`);
  const html = readablePlan(scenario, accepted, data);
  for (const step of accepted.steps) {
    const endpoint = map.get(step.endpointId);
    assert.ok(html.includes(escapeHtml(endpoint.title)), `${scenario.id}/${accepted.id}: solution names ${endpoint.title}`);
    assert.ok(html.includes("Purpose:"), `${scenario.id}/${accepted.id}: requests explain their purpose`);
  }
  const instructional = html.split('<details class="api-technical-preview">')[0];
  assert.doesNotMatch(instructional, /\$fromStep|"responsePath"/, `${scenario.id}/${accepted.id}: canonical binding objects stay in collapsed technical details`);
  for (const block of instructional.matchAll(/<details class="api-handled">[\s\S]*?<\/details>/g)) assert.doesNotMatch(block[0], /gpt-6-astra|text-embedding-3-small|omni-moderation-latest/, `${scenario.id}/${accepted.id}: fixed model identifiers stay out of application-handled summaries`);
  for (const step of accepted.steps) for (const [name, value] of Object.entries(step.parameters || {})) for (const ref of references(value)) {
    const source = map.get(accepted.steps.find((item) => item.step === ref.$fromStep).endpointId);
    const options = responseSourceChoices(scenario, source, name);
    const label = options.find((choice) => choice.canonicalPath === ref.path)?.label || source.responseFields.find((field) => field.path === ref.path)?.description;
    assert.ok(label && html.includes(escapeHtml(label.replace(/[.]$/, ""))), `${scenario.id}/${accepted.id}: dependency is explained with a documented field label`);
  }
  answerVariants++;
}
assert.equal(answerVariants, enabled.reduce((sum, scenario) => sum + scenario.acceptedPlans.length, 0));

for (const scenario of enabled) {
  for (const endpointId of scenario.availableEndpointIds) {
    const endpoint = map.get(endpointId), groups = classification(scenario, endpoint);
    if (!groups.automatic.length) continue;
    const markup = requestHtml([{ endpointId, parameters: automaticParameters(scenario, endpoint), dependencies: {} }], map, scenario);
    assert.match(markup, /Handled by the Application/, `${scenario.id}/${endpointId}: automatic setting section is available`);
    assert.doesNotMatch(markup, /<input[^>]+data-param="(?:model|messages|file|purpose)"/, `${scenario.id}/${endpointId}: application settings are not student-editable`);
    automaticSections++;
  }
}
const quiz = enabled.find((scenario) => scenario.id === "openai-reading-quiz-builder");
const quizEndpoint = map.get("openai.create-chat-completion");
const quizMarkup = requestHtml([{ endpointId: quizEndpoint.id, parameters: automaticParameters(quiz, quizEndpoint), dependencies: {} }], map, quiz);
assert.match(quizMarkup, /Application instructions and content/);
assert.doesNotMatch(quizMarkup, /gpt-6-astra|\[object Object\]|\{"role"/);

// The reflection is optional record detail: it is preserved verbatim, does not
// change attempt counters, and is removed by the existing local session reset.
const memory = new Map();
const storage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
let id = 0;
const tracker = createSessionTracker({ storage, id: () => `reflection-${++id}` });
const record = tracker.begin("documentation-lab", "Documentation Lab", "api-project/test", "Reflection Test");
const result = tracker.submit(record, true);
const before = tracker.snapshot().totals;
const reflection = "First, the app gets each track URI; then it puts those tracks in a new playlist.\nThis is my reasoning.";
assert.equal(tracker.annotate(record, { apiProjectReflection: reflection }), true);
assert.equal(tracker.snapshot().records[record].details.apiProjectReflection, reflection, "reflection preserves its exact wording and line breaks");
assert.deepEqual(tracker.snapshot().totals, before, "reflection does not change scoring");
assert.equal(result.status, "solved");
assert.ok(fs.readFileSync(new URL("../../summary.js", import.meta.url), "utf8").includes("apiProjectReflection"), "Session Summary renders saved reflections");
assert.ok(fs.readFileSync(new URL("../../summary.js", import.meta.url), "utf8").includes("esc(r.details.apiProjectReflection)"), "reflection output is HTML-escaped");
tracker.reset(true);
assert.equal(Object.keys(tracker.snapshot().records).length, 0, "existing session reset removes challenge reflections");

function escapeForRegex(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function escapeHtml(value) { return String(value).replaceAll("&", "&amp;").replaceAll("'", "&#39;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }
console.log(`Step 6: ${enabled.length} difficulty assignments (${distribution.beginner} beginner, ${distribution.intermediate} intermediate, ${distribution.advanced} advanced); filtered queue exhaustion, boundaries, disabled exclusion, ${answerVariants} accepted-plan explanations, ${automaticSections} application-handled request panels, optional local reflection, summary rendering, and reset passed.`);
