import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const base = new URL("../../wpr-games/workplace-readiness/", import.meta.url);
globalThis.self = globalThis;
globalThis.WRG = {};
for (const file of [
  "js/data/schema.js", "js/core/rng.js", "js/core/expr.js", "js/core/text.js", "js/core/order.js",
  "js/core/library.js", "js/core/feedback.js", "js/core/grader.js", "js/core/validator.js",
  "js/core/generator.js", "js/data/content-bundle.js", "js/compose/engine.js", "js/compose/check.js",
  "js/compose/selector.js", "js/data/compose-bundle.js"
]) vm.runInThisContext(readFileSync(new URL(file, base), "utf8"), { filename: file });
const W = globalThis.WRG;
const { generateWorkplaceAssessmentItem, workplaceCatalog, getWorkplaceAdapterDiagnostics } = await import(new URL("./workplace-adapter.js?test", import.meta.url));
const { sources, generateAssessmentItem } = await import(new URL("./adapters.js?workplace-test", import.meta.url));
const { buildAssessmentXml, buildManifest, formatQuestionHtml } = await import(new URL("./qti.js?workplace-test", import.meta.url));

assert.equal(workplaceCatalog().skills.length, 22);
assert.equal(workplaceCatalog().contexts.length, 13);
const source = sources.find(s => s.id === "workplace-readiness");
assert.equal(source.modes.length, 4);
let attempted = 0, accepted = 0, rejected = 0;
const cells = new Set(), skillLevels = new Set(), origins = new Map(), modeCounts = new Map();
const samples = [];
for (const skill of W.content.skills) for (const difficulty of ["Beginner", "Intermediate", "Advanced"]) {
  for (const mode of source.modes) for (let seed = 1; seed <= 20; seed++) {
    attempted++;
    const item = generateWorkplaceAssessmentItem(mode.id, difficulty, seed * 719 + W.content.skills.indexOf(skill) * 101 + mode.id.length, 3,
      { skills: [skill.id] });
    if (!item) { rejected++; continue; }
    accepted++;
    cells.add(`${skill.id}|${difficulty}|${mode.id}`);
    skillLevels.add(`${skill.id}|${difficulty}`);
    origins.set(`${mode.id}|${challengeOrigin(item)}`, (origins.get(`${mode.id}|${challengeOrigin(item)}`) || 0) + 1);
    modeCounts.set(mode.id, (modeCounts.get(mode.id) || 0) + 1);
    assert.equal(item.topicId, skill.id, "skill filter must be honored");
    assert.equal(item.difficulty.toLowerCase(), difficulty.toLowerCase(), "difficulty must be honored");
    assert.equal(item.choices.length, 4);
    assert.equal(new Set(item.choices.map(s => s.trim().toLowerCase())).size, 4);
    assert.equal(item.choices[item.correctIndex], item.correctAnswer);
    assert.equal(item.points, 3);
    assert.ok(item.explanation);
    const challenge = item._auditChallenge;
    assert.ok(challenge && challenge.skill === skill.id);
    const responses = item.choices.map((_, i) => {
      if (mode.id === "decision" || mode.id === "nextstep") return { optionId: challenge.options.find(o => o.text === item.choices[i]).id };
      if (mode.id === "find") return { segmentId: challenge.doc.segments.find((_, j) => item.choices[i] === `Line ${j + 1}`)?.id };
      const order = item.choices[i].split(" → ").map(label => challenge.steps[Number(label.replace("Sentence ", "")) - 1].id);
      return { order };
    });
    const outcomes = responses.map(r => W.grader.grade(challenge, r));
    assert.ok(outcomes.every(result => result.ok), `${skill.id}/${difficulty}/${mode.id}: grader must accept each option response`);
    assert.equal(outcomes.filter(result => result.correct).length, 1, `${skill.id}/${difficulty}/${mode.id}: exactly one correct option`);
    assert.equal(outcomes[item.correctIndex].correct, true);
    if (samples.length < 36) samples.push(item);
  }
}
assert.ok(accepted > 500, `expected rich coverage; accepted ${accepted}/${attempted}`);
assert.equal(skillLevels.size, 22 * 3, "all 66 skill/difficulty selections must produce questions");
const hybrid = W.selector.createHybrid(W.library.create(W.content), W.composeContent);
const unavailableCells = [];
for (const skill of W.content.skills) for (const difficulty of ["Beginner", "Intermediate", "Advanced"]) for (const mode of source.modes)
  if (!cells.has(`${skill.id}|${difficulty}|${mode.id}`)) {
    const eligible = W.selector.eligibleUnits(hybrid, { skills: [skill.id], modes: [mode.id], difficulty: difficulty.toLowerCase() });
    unavailableCells.push({ skill: skill.id, difficulty, mode: mode.id, eligibleUnits: eligible.length });
  }
for (const mode of source.modes) assert.ok(modeCounts.get(mode.id) > 0, `${mode.id} must generate items`);
for (const mode of source.modes) for (const origin of ["authored", "composed"])
  assert.ok(origins.get(`${mode.id}|${origin}`) > 0, `${mode.id} must adapt ${origin} challenges`);

// Repeatability, source-filter isolation, and all four question transformations.
const repeatA = generateWorkplaceAssessmentItem("decision", "Advanced", 44021, 2, { skills: ["workplace-safety"], contexts: ["healthcare"] });
const repeatB = generateWorkplaceAssessmentItem("decision", "Advanced", 44021, 2, { skills: ["workplace-safety"], contexts: ["healthcare"] });
assert.equal(repeatA.signature, repeatB.signature, "seeded items should reproduce exactly");
assert.equal(repeatA.contextId, "healthcare", "career-context filter should be honored");
for (const mode of source.modes) {
  const item = generateAssessmentItem("workplace-readiness", mode.id, "Intermediate", 9051, 2, { workplace: { skills: ["information-security"] } });
  assert.ok(item, `adapter registry should produce ${mode.id}`);
  assert.equal(item.topicId, "information-security"); assert.ok(formatQuestionHtml(item).length > 0);
}

for (const count of [10, 20, 50]) {
  const used = new Set(), reasons = new Set(), keys = new Set();
  for (let index = 0; index < count; index++) {
    const mode = source.modes[index % source.modes.length];
    let item = null;
    for (let retry = 0; retry < 140 && !item; retry++) {
      const candidate = generateWorkplaceAssessmentItem(mode.id, ["Beginner", "Intermediate", "Advanced"][index % 3], 83001 + index * 1009 + retry * 7919, 2);
      if (!candidate || used.has(candidate.configurationSignature) || reasons.has(candidate.reasoningSignature)) continue;
      item = candidate;
    }
    assert.ok(item, `should fill ${count} questions without repeating a reasoning configuration; failed at ${index}`);
    assert.ok(!keys.has(item.signature), "exact displayed question should not repeat");
    used.add(item.configurationSignature); keys.add(item.signature);
    reasons.add(item.reasoningSignature);
  }
}

const unique = [], seen = new Set();
for (let i = 0; unique.length < 12 && i < 500; i++) {
  const mode = source.modes[i % source.modes.length];
  const q = generateAssessmentItem("workplace-readiness", mode.id, "Mixed", 70000 + i * 31, 2);
  if (!q || seen.has(q.configurationSignature)) continue;
  seen.add(q.configurationSignature); q.id = `wpr-${unique.length + 1}`; unique.push(q);
}
assert.equal(unique.length, 12);
const xml = buildAssessmentXml({ title: "Workplace sample", seed: 70000 }, unique);
assert.equal((xml.match(/<item ident=/g) || []).length, unique.length);
assert.equal((xml.match(/<setvar action="Set" varname="SCORE">100<\/setvar>/g) || []).length, unique.length);
assert.ok(buildManifest().includes('href="assessment.xml"'));
assert.ok(xml.includes("Line 1:"), "document lines should remain in QTI question content");
assert.ok(xml.includes("Sentence 1:"), "order items should preserve numbered sentence content");
assert.ok(xml.includes("choice_"));
const stats = getWorkplaceAdapterDiagnostics();
assert.equal(stats.attempted, stats.accepted + Object.values(stats.rejected).reduce((a, b) => a + b, 0));
console.log(`Workplace adapter seeded matrix: ${accepted} accepted, ${rejected} rejected of ${attempted}; 66 skill/difficulty selections and all four modes yielded valid items; authored and compositional content covered; all displayed choices checked by source grader. Mode/filter gaps observed in 20 seeded draws: ${JSON.stringify(unavailableCells)}. Overall adapter diagnostics: ${JSON.stringify(stats)}. Deterministic generation, 10/20/50 unique quizzes, and QTI content passed.`);

function challengeOrigin(item) { return item._auditChallenge.source; }
