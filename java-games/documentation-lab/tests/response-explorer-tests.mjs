import fs from "node:fs";
import assert from "node:assert/strict";
import { buildView, gradeFindData, renderExplanation, sourceSamples } from "../response-explorer-engine.js";

const read = (name) => JSON.parse(fs.readFileSync(new URL(`../${name}`, import.meta.url), "utf8"));
const data = read("response-explorer-data-v1.json");
const runtimeIndex = read("api-project-data-v1-runtime-index.json");
const runtimeParts = runtimeIndex.runtimeParts.map((path) => read(path.replace(/^\.\//, "")));
const library = { schemaVersion: runtimeParts[0].schemaVersion, providers: runtimeParts.flatMap((part) => part.providers), scenarios: runtimeParts.flatMap((part) => part.scenarios) };
const vectors = read("response-explorer-test-vectors.json").vectors;
const samples = sourceSamples(library);
const templates = data.feedbackTemplates;
const challenges = new Map(data.challenges.map((challenge) => [challenge.id, challenge]));
const fdVectors = vectors.filter((vector) => challenges.get(vector.challenge)?.format === "find-data");

assert.equal(fdVectors.length, 8, "the pilot must expose exactly eight Find the Data challenges");
for (const vector of fdVectors) {
  const challenge = challenges.get(vector.challenge);
  const body = samples.get(challenge.sampleId);
  assert.ok(body, `${vector.challenge} sample is available`);
  const view = buildView(body, challenge);
  assert.deepEqual(view.rows.map((row) => row.concrete), vector.initialRows, `${vector.challenge} initial tree rows match the reference vector`);
  assert.equal(view.rows.length, vector.initialRowCount, `${vector.challenge} initial tree row count matches`);
  for (const testCase of vector.cases) {
    const result = gradeFindData(challenge, testCase.select, templates);
    assert.equal(result.correct, testCase.correct, `${vector.challenge} ${testCase.select} correctness`);
    assert.equal(result.outcome, testCase.outcome, `${vector.challenge} ${testCase.select} outcome`);
    assert.equal(result.misconceptionId ?? null, testCase.misconceptionId ?? null, `${vector.challenge} ${testCase.select} misconception`);
  }
  const explanation = renderExplanation(challenge.explanation.text, body, Object.fromEntries((challenge.relatedSamples || []).map((related) => [related.sampleId, samples.get(related.sampleId)])));
  assert.ok(explanation && !explanation.includes("{{value:"), `${vector.challenge} explanation tokens render`);
}

const related = challenges.get("rx-sp-fd-02");
assert.equal(related.relatedSamples.length, 1, "the related sample challenge keeps its comparison tab");
assert.ok(samples.has(related.relatedSamples[0].sampleId), "the related sample body is available");

console.log(`Response Explorer Find the Data: ${fdVectors.length} challenges, ${fdVectors.reduce((n, vector) => n + vector.cases.length, 0)} reference grading cases, exact initial rows, alternatives, nested paths, root arrays, explanations, and related sample data passed.`);
