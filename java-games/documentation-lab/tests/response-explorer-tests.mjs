import fs from "node:fs";
import assert from "node:assert/strict";
import {
  buildView, gradeFindData, gradeStructureSingle, gradeStructureSlots,
  gradeStructureClassification, gradeSelectNeeds, renderExplanation,
  sourceSamples, matchingChallenges, shuffleChallenges,
} from "../response-explorer-engine.js";

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

let structureCases = 0, needsCases = 0, initialRows = 0;
for (const vector of vectors.filter((item) => challenges.get(item.challenge)?.format !== "find-data")) {
  const challenge = challenges.get(vector.challenge);
  const body = samples.get(challenge.sampleId);
  assert.ok(body, `${vector.challenge} sample is available`);
  const view = buildView(body, challenge);
  assert.equal(view.rows.length, vector.initialRowCount, `${vector.challenge} initial tree row count`);
  assert.deepEqual(view.rows.map((row) => row.concrete), vector.initialRows, `${vector.challenge} initial tree rows`);
  initialRows += view.rows.length;
  if (vector.mode === "single") {
    for (const testCase of vector.cases) {
      const result = gradeStructureSingle(challenge, testCase.select, templates);
      assert.equal(result.correct, testCase.correct, `${vector.challenge} ${testCase.select} correctness`);
      assert.equal(result.outcome, testCase.outcome, `${vector.challenge} ${testCase.select} outcome`);
      assert.equal(result.misconceptionId ?? null, testCase.misconceptionId ?? null, `${vector.challenge} ${testCase.select} misconception`);
      structureCases++;
    }
  } else if (vector.mode === "slots") {
    for (const [slotId, cases] of Object.entries(vector.slotCases)) for (const testCase of cases) {
      const result = gradeStructureSlots(challenge, { [slotId]: testCase.select }, templates);
      const slot = result.slots.find((item) => item.slotId === slotId);
      assert.equal(slot.correct, testCase.correct, `${vector.challenge}/${slotId} ${testCase.select} correctness`);
      assert.equal(slot.outcome, testCase.outcome, `${vector.challenge}/${slotId} ${testCase.select} outcome`);
      assert.equal(slot.misconceptionId ?? null, testCase.misconceptionId ?? null, `${vector.challenge}/${slotId} ${testCase.select} misconception`);
      structureCases++;
    }
    const duplicate = gradeStructureSlots(challenge, vector.duplicateCase.selection, templates);
    assert.equal(duplicate.correct, vector.duplicateCase.correct, `${vector.challenge} duplicate slot assignment`);
    assert.equal(duplicate.slots.find((item) => item.outcome === "duplicate-node")?.outcome, "duplicate-node");
    assert.equal(gradeStructureSlots(challenge, vector.canonicalSlots, templates).correct, vector.canonicalResult, `${vector.challenge} canonical slots`);
  } else if (vector.mode === "classify") {
    assert.equal(gradeStructureClassification(challenge, vector.canonical).correct, vector.canonicalResult, `${vector.challenge} canonical classification`);
    for (const wrong of vector.singleWrong) {
      const choices = { ...vector.canonical, [wrong.item]: wrong.chose };
      const result = gradeStructureClassification(challenge, choices);
      assert.equal(result.correct, wrong.correct, `${vector.challenge} ${wrong.item}=${wrong.chose}`);
      assert.ok(result.feedback.includes(wrong.item.toUpperCase()), `${vector.challenge} classification feedback names item`);
      structureCases++;
    }
  } else if (vector.mode === "set") {
    for (const testCase of vector.cases) {
      const result = gradeSelectNeeds(challenge, testCase.select, templates);
      assert.equal(result.correct, testCase.correct, `${vector.challenge} ${testCase.label} correctness`);
      assert.equal(result.missing.length, testCase.missingCount, `${vector.challenge} ${testCase.label} missing requirements`);
      assert.deepEqual(result.extras.map((item) => item.path), testCase.extraPaths, `${vector.challenge} ${testCase.label} extra paths`);
      assert.deepEqual(result.extras.filter((item) => item.role !== "optional").map((item) => item.role), testCase.extraRoles, `${vector.challenge} ${testCase.label} extra roles`);
      needsCases++;
    }
  }
  const relatedBodies = Object.fromEntries((challenge.relatedSamples || []).map((item) => [item.sampleId, samples.get(item.sampleId)]));
  const explanation = renderExplanation(challenge.explanation.text, body, relatedBodies);
  assert.ok(explanation && !explanation.includes("{{value:"), `${vector.challenge} explanation tokens render`);
}

assert.equal(data.challenges.length, 24, "all authored challenges stay available");
assert.equal(data.challenges.filter((challenge) => challenge.format === "understand-structure").length, 8);
assert.equal(data.challenges.filter((challenge) => challenge.format === "select-needs").length, 8);
for (const challenge of data.challenges) assert.ok(["beginner", "intermediate", "advanced"].includes(challenge.difficulty), `${challenge.id} has a valid difficulty`);
assert.equal(matchingChallenges(data, { format: "mixed" }).length, 24, "mixed practice includes every activity");
assert.equal(matchingChallenges(data, { format: "select-needs", provider: "discord" }).length, 2, "provider and activity filters combine");
assert.equal(matchingChallenges(data, { format: "understand-structure", provider: "spotify", difficulty: "beginner" }).length, 0, "empty combinations stay empty");
const reachable = shuffleChallenges(data.challenges, "", () => 0.37);
assert.equal(new Set(reachable.map((challenge) => challenge.id)).size, data.challenges.length, "queue visits every challenge once");
assert.notEqual(shuffleChallenges(data.challenges, data.challenges[0].id, () => 0)[0].id, data.challenges[0].id, "queue avoids an immediate cycle repeat");

console.log(`Response Explorer: ${data.challenges.length} challenges across three activities; ${fdVectors.length} Find the Data challenges/${fdVectors.reduce((n, vector) => n + vector.cases.length, 0)} reference cases, ${structureCases} structure cases, ${needsCases} field-selection cases, ${initialRows} initially visible rows, path normalization, authored feedback, sample explanations, filters, and repeat-avoiding queues passed.`);
