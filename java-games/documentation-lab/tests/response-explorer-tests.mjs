import fs from "node:fs";
import assert from "node:assert/strict";
import {
  buildView, gradeFindData, gradeStructureSingle, gradeStructureSlots,
  gradeStructureClassification, gradeSelectNeeds, renderExplanation,
  sourceSamples, sourceSampleOwners, matchingChallenges, shuffleChallenges, unseenChallenges, resolve, concreteForPath, structuralOf, parsePath, formatConcrete,
} from "../response-explorer-engine.js";
import { generateResponseExplorerExpansion, expansionModels } from "../response-explorer-expansion.js";
import { challengePaths } from "../response-explorer-ui.js";

const read = (name) => JSON.parse(fs.readFileSync(new URL(`../${name}`, import.meta.url), "utf8"));
const data = read("response-explorer-data-v1.json");
const runtimeIndex = read("api-project-data-v1-runtime-index.json");
const runtimeParts = runtimeIndex.runtimeParts.map((path) => read(path.replace(/^\.\//, "")));
const library = { schemaVersion: runtimeParts[0].schemaVersion, providers: runtimeParts.flatMap((part) => part.providers), scenarios: runtimeParts.flatMap((part) => part.scenarios) };
const vectors = read("response-explorer-test-vectors.json").vectors;
const samples = sourceSamples(library);
const owners = sourceSampleOwners(library);
const generated = generateResponseExplorerExpansion({ sampleMap: samples, ownerBySample: owners });
const allData = { ...data, challenges: [...data.challenges, ...generated] };
const templates = data.feedbackTemplates;
const challenges = new Map(data.challenges.map((challenge) => [challenge.id, challenge]));
const fdVectors = vectors.filter((vector) => challenges.get(vector.challenge)?.format === "find-data");

const tiktokStructure = data.challenges.find((challenge) => challenge.id === "rx-tt-st-01");
assert.ok(tiktokStructure, "the previously reported TikTok structure challenge remains in the library");
const tiktokBody = samples.get(tiktokStructure.sampleId);
assert.equal(gradeStructureClassification(tiktokStructure, Object.fromEntries(tiktokStructure.grading.assignments.map((item) => [item.item, item.correct]))).correct, true, "TikTok's authored classifications pass the grader");
const tiktokAcceptedPaths = challengePaths(tiktokStructure, tiktokBody);
assert.equal(tiktokAcceptedPaths.length, tiktokStructure.answer.items.length, "accepted TikTok classification renders the successful path highlights without throwing");
for (const item of tiktokStructure.answer.items) assert.ok(tiktokAcceptedPaths.includes(concreteForPath(item.path, tiktokBody)), `TikTok classification highlight resolves ${item.path}`);

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

// Expansion validation uses the real bundled runtime samples and the same graders as the UI.
const formatIds = ["find-data", "understand-structure", "select-needs"];
assert.equal(generated.length, 135, "the bounded library adds 45 validated variants per activity");
assert.equal(allData.challenges.length, 159, "the complete library exceeds 150 playable challenges");
for (const format of formatIds) assert.equal(matchingChallenges(allData, { format }).length, 53, `${format} has at least 50 challenges`);
for (const [name, models] of Object.entries(expansionModels())) {
  assert.equal(models.length, 15, `${name} includes 15 distinct reasoning models`);
  assert.ok(new Set(models.map((model) => model.id)).size === models.length, `${name} model IDs are unique`);
}
let generatedChecks = 0;
function allConcretePaths(value, path = "$") {
  const result = [path];
  if (Array.isArray(value)) value.forEach((child, index) => result.push(...allConcretePaths(child, `${path}[${index}]`)));
  else if (value && typeof value === "object") for (const [key, child] of Object.entries(value)) result.push(...allConcretePaths(child, path === "$" ? `$.${key}` : `${path}.${key}`));
  return result;
}
for (const challenge of generated) {
  assert.ok(challenge.instruction?.trim() && !challenge.instruction.includes("undefined"), `${challenge.id} shows a complete student instruction`);
  const body = samples.get(challenge.sampleId);
  assert.ok(body, `${challenge.id} sample is loaded`);
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(body)), `${challenge.id} response is serializable JSON`);
  assert.ok(challenge.reasoningModelId && challenge.variantId, `${challenge.id} has model and variant identities`);
  assert.ok(["beginner", "intermediate", "advanced"].includes(challenge.difficulty), `${challenge.id} has a difficulty`);
  assert.equal(challenge.authoring.status, "validated", `${challenge.id} carries validated authoring status`);
  const resolves = (path) => resolve(path, body).length > 0;
  const targetPaths = [
    ...(challenge.answer.acceptedPaths || []),
    ...(challenge.grading.slots || []).flatMap((slot) => slot.accepted.map((item) => item.concretePath || item.path)),
    ...(challenge.answer.items || []).map((item) => item.path),
    ...(challenge.grading.requirements || []).flatMap((item) => item.accepted.map((accepted) => accepted.path)),
  ];
  for (const path of targetPaths) {
    const concrete = concreteForPath(path, body) || path;
    const tokens = parsePath(concrete), expanded = new Map();
    for (let end = 0; end < tokens.length; end++) expanded.set(formatConcrete(tokens.slice(0, end)), true);
    const visible = buildView(body, challenge, expanded).rows.map((row) => row.concrete);
    assert.ok(visible.includes(concrete), `${challenge.id} target ${path} can be reached through the rendered tree`);
  }
  for (const accepted of challenge.grading.accepted || []) assert.ok(resolves(accepted.concretePath || accepted.path), `${challenge.id} accepted path resolves`);
  for (const rejected of challenge.grading.rejected || []) assert.ok(resolves(rejected.path), `${challenge.id} misconception path resolves`);
  for (const slot of challenge.grading.slots || []) for (const accepted of slot.accepted) assert.ok(resolves(accepted.concretePath || accepted.path), `${challenge.id}/${slot.id} slot path resolves`);
  for (const assignment of challenge.grading.assignments || []) assert.ok(resolves(challenge.answer.items.find((item) => item.id === assignment.item).path), `${challenge.id}/${assignment.item} classification path resolves`);
  for (const requirement of challenge.grading.requirements || []) for (const accepted of requirement.accepted) assert.ok(resolves(accepted.path), `${challenge.id}/${requirement.id} required field resolves`);
  for (const distractor of challenge.grading.distractors || []) assert.ok(resolves(distractor.path), `${challenge.id} distractor resolves`);

  if (challenge.format === "find-data") {
    const concrete = challenge.answer.acceptedPaths[0];
    assert.deepEqual(challenge.expectedValue, resolve(concrete, body)[0].value, `${challenge.id} expected value matches its accepted path`);
    assert.equal(gradeFindData(challenge, concrete, templates).correct, true, `${challenge.id} accepted target passes`);
    const wrong = challenge.grading.rejected?.[0]?.path;
    if (wrong) assert.equal(gradeFindData(challenge, concreteForPath(wrong, body), templates).correct, false, `${challenge.id} authored misconception fails`);
    if (challenge.grading.accepted[0].match === "concrete") {
      const targetIndex = Number(challenge.grading.accepted[0].concretePath.match(/\[(\d+)\]/)?.[1]);
      if (Number.isInteger(targetIndex) && targetIndex > 0) {
        const wrongRecord = challenge.grading.accepted[0].concretePath.replace(`[${targetIndex}]`, "[0]");
        assert.equal(gradeFindData(challenge, wrongRecord, templates).correct, false, `${challenge.id} rejects the wrong record index`);
      }
    }
  } else if (challenge.format === "understand-structure") {
    if (challenge.answer.mode === "single") {
      assert.equal(gradeStructureSingle(challenge, challenge.answer.acceptedPaths[0], templates).correct, true, `${challenge.id} accepted structure node passes`);
      const accepted = new Set(challenge.grading.accepted.map((item) => item.path));
      const wrong = allConcretePaths(body).find((path) => !accepted.has(structuralOf(path)));
      assert.ok(wrong, `${challenge.id} has a real incorrect node available`);
      assert.equal(gradeStructureSingle(challenge, wrong, templates).correct, false, `${challenge.id} wrong structure node fails`);
    } else if (challenge.answer.mode === "slots") {
      const correct = Object.fromEntries(challenge.grading.slots.map((slot) => [slot.id, slot.accepted[0].concretePath || concreteForPath(slot.accepted[0].path, body)]));
      assert.equal(gradeStructureSlots(challenge, correct, templates).correct, true, `${challenge.id} accepted slot assignments pass`);
      const accepted = new Set(challenge.grading.slots.flatMap((slot) => slot.accepted.map((item) => item.path)));
      const wrong = allConcretePaths(body).find((path) => !accepted.has(structuralOf(path)));
      assert.ok(wrong, `${challenge.id} has a real incorrect slot node available`);
      const incorrect = { ...correct, [challenge.grading.slots[0].id]: wrong };
      assert.equal(gradeStructureSlots(challenge, incorrect, templates).correct, false, `${challenge.id} incorrect slot assignment fails`);
    } else {
      const correct = Object.fromEntries(challenge.grading.assignments.map((item) => [item.item, item.correct]));
      assert.equal(gradeStructureClassification(challenge, correct).correct, true, `${challenge.id} accepted classifications pass`);
      assert.doesNotThrow(() => challengePaths(challenge, body), `${challenge.id} accepted classification can render its completed state`);
      const first = challenge.grading.assignments[0];
      const wrongCategory = challenge.answer.categories.find((category) => category.id !== first.correct).id;
      assert.equal(gradeStructureClassification(challenge, { ...correct, [first.item]: wrongCategory }).correct, false, `${challenge.id} incorrect classification fails`);
    }
  } else {
    const correct = challenge.grading.requirements.map((item) => concreteForPath(item.accepted[0].path, body));
    assert.equal(gradeSelectNeeds(challenge, correct, templates).correct, true, `${challenge.id} complete required field set passes`);
    assert.equal(gradeSelectNeeds(challenge, correct.slice(1), templates).correct, false, `${challenge.id} missing a required field fails`);
    const distractor = challenge.grading.distractors[0];
    if (distractor) assert.equal(gradeSelectNeeds(challenge, [...correct, concreteForPath(distractor.path, body)], templates).correct, false, `${challenge.id} unnecessary field fails`);
  }
  const explanation = renderExplanation(challenge.explanation.text, body, {});
  assert.ok(explanation && !explanation.includes("{{value:"), `${challenge.id} explanation renders`);
  assert.doesNotThrow(() => challengePaths(challenge, body), `${challenge.id} accepted answer can derive UI highlights`);
  generatedChecks++;
}

const fullQueue = shuffleChallenges(allData.challenges, "", () => 0.37);
assert.equal(new Set(fullQueue.map((challenge) => challenge.id)).size, allData.challenges.length, "the queue visits all eligible challenges before a repeat");
for (let i = 1; i < fullQueue.length; i++) {
  const previousModel = fullQueue[i - 1].reasoningModelId || fullQueue[i - 1].reasoningFamily;
  const currentModel = fullQueue[i].reasoningModelId || fullQueue[i].reasoningFamily;
  assert.notEqual(currentModel, previousModel, "the queue avoids adjacent reasoning models when alternatives exist");
}
assert.notEqual(shuffleChallenges(allData.challenges, allData.challenges[0].id, () => 0)[0].id, allData.challenges[0].id, "expanded queue avoids a cycle-boundary repeat");
for (let seed = 1; seed <= 50; seed++) {
  let state = seed;
  const random = () => ((state = (state * 48271) % 2147483647) - 1) / 2147483646;
  const queue = shuffleChallenges(allData.challenges, "", random);
  assert.equal(new Set(queue.map((challenge) => challenge.id)).size, allData.challenges.length, `seed ${seed} visits each challenge once`);
  for (let index = 1; index < queue.length; index++) assert.notEqual(queue[index].reasoningModelId || queue[index].reasoningFamily, queue[index - 1].reasoningModelId || queue[index - 1].reasoningFamily, `seed ${seed} avoids adjacent models`);
}
assert.equal(matchingChallenges(allData, { format: "mixed" }).length, allData.challenges.length, "mixed practice includes all three activities");
const seen = new Set(allData.challenges.slice(0, 40).map((challenge) => challenge.id));
assert.ok(unseenChallenges(allData.challenges, seen).every((challenge) => !seen.has(challenge.id)), "filter changes can continue with unvisited eligible challenges");
assert.equal(unseenChallenges(matchingChallenges(allData, { format: "find-data", provider: "tiktok" }), seen).length, matchingChallenges(allData, { format: "find-data", provider: "tiktok" }).filter((challenge) => !seen.has(challenge.id)).length, "provider and activity changes preserve session repeat avoidance");

function shape(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return `array(${value.length ? shape(value[0]) : "empty"})`;
  if (typeof value !== "object") return typeof value;
  return `{${Object.keys(value).sort().map((key) => `${key}:${shape(value[key])}`).join(",")}}`;
}
const diversity = Object.fromEntries(formatIds.map((format) => {
  const group = generated.filter((item) => item.format === format);
  const fingerprints = new Set(group.map((item) => {
    const body = samples.get(item.sampleId);
    const paths = [...(item.answer.acceptedPaths || []), ...(item.grading.slots || []).flatMap((slot) => slot.accepted.map((a) => a.concretePath || a.path)), ...(item.grading.requirements || []).flatMap((requirement) => requirement.accepted.map((a) => a.path)), ...(item.grading.assignments || []).map((assignment) => item.answer.items.find((node) => node.id === assignment.item).path)];
    return `${shape(body)}|${item.answer.mode}|${paths.map((path) => path.replace(/\[\d+\]/g, "[]")).join(";")}|${item.grading.requirements?.length || item.grading.assignments?.length || item.grading.slots?.length || 1}`;
  }));
  return [format, { models: new Set(group.map((item) => item.reasoningModelId)).size, variants: group.length, fingerprints: fingerprints.size, difficulty: Object.fromEntries(["beginner", "intermediate", "advanced"].map((level) => [level, group.filter((item) => item.difficulty === level).length])), providers: Object.fromEntries([...new Set(group.map((item) => item.providerId))].map((provider) => [provider, group.filter((item) => item.providerId === provider).length])) }];
}));
for (const [format, report] of Object.entries(diversity)) {
  assert.ok(report.fingerprints >= 10, `${format} includes structurally diverse response/path fingerprints`);
  assert.equal(Object.keys(report.providers).length, 6, `${format} includes challenges from all six API providers`);
}
const totalDistribution = {
  difficulty: Object.fromEntries(["beginner", "intermediate", "advanced"].map((level) => [level, allData.challenges.filter((item) => item.difficulty === level).length])),
  providers: Object.fromEntries([...new Set(allData.challenges.map((item) => item.providerId))].map((provider) => [provider, allData.challenges.filter((item) => item.providerId === provider).length])),
};
assert.equal(Object.keys(totalDistribution.providers).length, 6, "the complete library covers all six providers");

console.log(`Response Explorer: ${allData.challenges.length} challenges (53 per activity); ${generatedChecks} generated challenges validated against runtime samples and shared graders; diversity ${JSON.stringify(diversity)}; total distribution ${JSON.stringify(totalDistribution)}; ${fdVectors.length} authored Find the Data challenges/${fdVectors.reduce((n, vector) => n + vector.cases.length, 0)} reference cases, ${structureCases} structure cases, ${needsCases} field-selection cases, ${initialRows} initially visible rows, authored feedback, sample explanations, filters, and repeat-avoiding queues passed.`);
